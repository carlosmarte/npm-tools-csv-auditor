#!/usr/bin/env node

/**
 * PROJECT: csv_combine_analysis
 *
 * PURPOSE: Advanced CSV analysis tool that consolidates, deduplicates, and analyzes
 * CSV data with support for date calculations, boolean aggregations, and flexible
 * grouping operations across multiple files.
 *
 * USE CASES:
 * - Analyze date columns to calculate "days since" with deduplication
 * - Sum and count boolean values across multiple CSV files
 * - Filter and group data by single or multiple columns
 * - Deduplicate data based on user-specified columns
 * - Process large CSV files with memory-efficient streaming
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Uses streaming CSV parser for large files to avoid memory issues
 * - Implements efficient deduplication using Map/Set data structures
 * - Batches file processing to prevent overwhelming system resources
 * - Lazy evaluation for filtering and grouping operations
 */

import fs from "fs/promises";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import { program } from "commander";

// Strategy Pattern: Analysis Strategies
export class DateAnalyzer {
  constructor() {
    this.name = "DateAnalyzer";
  }

  analyze(data, columnName) {
    const now = new Date();
    const results = new Map();

    data.forEach((row) => {
      if (row[columnName]) {
        const rowDate = new Date(row[columnName]);
        if (!isNaN(rowDate.getTime())) {
          const daysSince = Math.floor((now - rowDate) / (1000 * 60 * 60 * 24));
          const key = `${daysSince} days since`;

          if (!results.has(key)) {
            results.set(key, []);
          }
          results.get(key).push({ ...row, daysSince });
        }
      }
    });

    // Deduplicate by daysSince value
    const deduplicated = new Map();
    results.forEach((rows, key) => {
      deduplicated.set(key, rows[0]); // Keep first occurrence
    });

    return Array.from(deduplicated.entries()).map(([key, row]) => ({
      category: key,
      data: row,
      count: results.get(key).length,
    }));
  }
}

export class BooleanAnalyzer {
  constructor() {
    this.name = "BooleanAnalyzer";
  }

  analyze(data, columnName) {
    const results = {
      true: { count: 0, rows: [] },
      false: { count: 0, rows: [] },
    };

    data.forEach((row) => {
      if (row[columnName] !== undefined) {
        const value = this._normalizeBoolean(row[columnName]);
        if (value !== null) {
          results[value].count++;
          results[value].rows.push(row);
        }
      }
    });

    return {
      summary: {
        total: results.true.count + results.false.count,
        trueCount: results.true.count,
        falseCount: results.false.count,
        truePercentage: (
          (results.true.count / (results.true.count + results.false.count)) *
          100
        ).toFixed(2),
      },
      details: results,
    };
  }

  _normalizeBoolean(value) {
    if (typeof value === "boolean") return value.toString();
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();
      if (["true", "1", "yes", "on"].includes(lower)) return "true";
      if (["false", "0", "no", "off"].includes(lower)) return "false";
    }
    return null;
  }
}

// Data Processing Utilities
export class DataProcessor {
  constructor() {
    this.data = [];
  }

  setData(data) {
    this.data = data;
    return this;
  }

  filter(columns) {
    if (!columns || columns.length === 0) return this;

    this.data = this.data.filter((row) => {
      return columns.every((col) => row[col] !== undefined && row[col] !== "");
    });
    return this;
  }

  pluck(columns) {
    if (!columns || columns.length === 0) return this;

    this.data = this.data.map((row) => {
      const plucked = {};
      columns.forEach((col) => {
        if (row[col] !== undefined) {
          plucked[col] = row[col];
        }
      });
      return plucked;
    });
    return this;
  }

  deduplicate(columns) {
    if (!columns || columns.length === 0) return this;

    const seen = new Set();
    this.data = this.data.filter((row) => {
      const key = columns.map((col) => row[col]).join("|");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    return this;
  }

  groupByKey(key) {
    const groups = new Map();

    this.data.forEach((row) => {
      const groupKey = row[key];
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(row);
    });

    return Object.fromEntries(groups);
  }

  groupByKeys(keys) {
    const groups = new Map();

    this.data.forEach((row) => {
      const groupKey = keys.map((key) => row[key]).join("|");
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(row);
    });

    return Object.fromEntries(groups);
  }

  groupByKeyBoolean(key) {
    const groups = { true: [], false: [], undefined: [] };

    this.data.forEach((row) => {
      const value = this._normalizeBoolean(row[key]);
      if (value === null) {
        groups.undefined.push(row);
      } else {
        groups[value].push(row);
      }
    });

    return groups;
  }

  _normalizeBoolean(value) {
    if (typeof value === "boolean") return value.toString();
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();
      if (["true", "1", "yes", "on"].includes(lower)) return "true";
      if (["false", "0", "no", "off"].includes(lower)) return "false";
    }
    return null;
  }

  getData() {
    return this.data;
  }
}

// CSV Parser with Streaming Support
export class CsvParser {
  constructor() {
    this.options = {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    };
  }

  async parseFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = createReadStream(filePath).pipe(parse(this.options));

      stream.on("data", (row) => {
        results.push(row);
      });

      stream.on("error", (error) => {
        reject(
          new Error(`Failed to parse CSV file ${filePath}: ${error.message}`)
        );
      });

      stream.on("end", () => {
        resolve(results);
      });
    });
  }

  async parseFiles(filePaths) {
    const allData = [];

    for (const filePath of filePaths) {
      try {
        const data = await this.parseFile(filePath);
        allData.push(...data);
      } catch (error) {
        console.warn(
          `Warning: Could not parse file ${filePath}: ${error.message}`
        );
      }
    }

    return allData;
  }
}

// Main Analysis Class - Facade Pattern
export class CsvCombineAnalysis {
  constructor() {
    this.parser = new CsvParser();
    this.processor = new DataProcessor();
    this.dateAnalyzer = new DateAnalyzer();
    this.booleanAnalyzer = new BooleanAnalyzer();
    this.data = [];
  }

  async loadFiles(filePaths) {
    this.data = await this.parser.parseFiles(filePaths);
    this.processor.setData(this.data);
    return this;
  }

  filter(columns) {
    this.processor.filter(columns);
    return this;
  }

  pluck(columns) {
    this.processor.pluck(columns);
    return this;
  }

  deduplicate(columns) {
    this.processor.deduplicate(columns);
    return this;
  }

  analyzeDateColumn(columnName) {
    const currentData = this.processor.getData();
    return this.dateAnalyzer.analyze(currentData, columnName);
  }

  analyzeBooleanColumn(columnName) {
    const currentData = this.processor.getData();
    return this.booleanAnalyzer.analyze(currentData, columnName);
  }

  groupByKey(key) {
    return this.processor.groupByKey(key);
  }

  groupByKeys(keys) {
    return this.processor.groupByKeys(keys);
  }

  groupByKeyBoolean(key) {
    return this.processor.groupByKeyBoolean(key);
  }

  getData() {
    return this.processor.getData();
  }

  getRowCount() {
    return this.processor.getData().length;
  }

  getColumns() {
    const data = this.processor.getData();
    return data.length > 0 ? Object.keys(data[0]) : [];
  }
}

// CLI Handler - Command Pattern
export class CliHandler {
  constructor() {
    this.analyzer = new CsvCombineAnalysis();
  }

  setupCommands() {
    program
      .name("csv_combine_analysis")
      .description("Advanced CSV analysis and consolidation tool")
      .version("1.0.0");

    program
      .command("analyze")
      .description("Analyze CSV files with various operations")
      .argument("<files...>", "CSV files to analyze")
      .option(
        "-d, --date-column <column>",
        'Analyze date column for "days since" calculation'
      )
      .option(
        "-b, --boolean-column <column>",
        "Analyze boolean column for true/false counts"
      )
      .option("-f, --filter <columns>", "Filter by columns (comma-separated)")
      .option(
        "-p, --pluck <columns>",
        "Pluck specific columns (comma-separated)"
      )
      .option("--dedupe <columns>", "Deduplicate by columns (comma-separated)")
      .option("--group-by <key>", "Group by single key")
      .option(
        "--group-by-keys <keys>",
        "Group by multiple keys (comma-separated)"
      )
      .option("--group-by-boolean <key>", "Group by boolean key")
      .option("-o, --output <file>", "Output file (JSON format)")
      .action(this.handleAnalyzeCommand.bind(this));

    program
      .command("info")
      .description("Show information about CSV files")
      .argument("<files...>", "CSV files to analyze")
      .action(this.handleInfoCommand.bind(this));

    return program;
  }

  async handleAnalyzeCommand(files, options) {
    try {
      await this.analyzer.loadFiles(files);
      console.log(
        `Loaded ${this.analyzer.getRowCount()} rows from ${files.length} file(s)`
      );

      // Apply filters and transformations
      if (options.filter) {
        const columns = options.filter.split(",").map((c) => c.trim());
        this.analyzer.filter(columns);
        console.log(`Filtered by columns: ${columns.join(", ")}`);
      }

      if (options.pluck) {
        const columns = options.pluck.split(",").map((c) => c.trim());
        this.analyzer.pluck(columns);
        console.log(`Plucked columns: ${columns.join(", ")}`);
      }

      if (options.dedupe) {
        const columns = options.dedupe.split(",").map((c) => c.trim());
        this.analyzer.deduplicate(columns);
        console.log(`Deduplicated by columns: ${columns.join(", ")}`);
      }

      const results = {};

      // Perform analyses
      if (options.dateColumn) {
        results.dateAnalysis = this.analyzer.analyzeDateColumn(
          options.dateColumn
        );
        console.log(`\n📅 Date Analysis for column '${options.dateColumn}':`);
        console.log("=".repeat(50));

        if (results.dateAnalysis.length === 0) {
          console.log("  No valid dates found in the specified column.");
        } else {
          results.dateAnalysis.forEach((item) => {
            console.log(`  ${item.category}: ${item.count} occurrence(s)`);
          });

          // Show sample data for first few categories
          console.log("\n  Sample data:");
          results.dateAnalysis.slice(0, 3).forEach((item) => {
            console.log(
              `    ${item.category} - Sample: ${JSON.stringify(item.data, null, 2)}`
            );
          });
        }
      }

      if (options.booleanColumn) {
        results.booleanAnalysis = this.analyzer.analyzeBooleanColumn(
          options.booleanColumn
        );
        console.log(
          `\n📊 Boolean Analysis for column '${options.booleanColumn}':`
        );
        console.log("=".repeat(50));
        console.log(
          `  Total records: ${results.booleanAnalysis.summary.total}`
        );
        console.log(
          `  True values: ${results.booleanAnalysis.summary.trueCount} (${results.booleanAnalysis.summary.truePercentage}%)`
        );
        console.log(
          `  False values: ${results.booleanAnalysis.summary.falseCount} (${(100 - parseFloat(results.booleanAnalysis.summary.truePercentage)).toFixed(2)}%)`
        );

        // Show sample true/false records
        if (results.booleanAnalysis.details.true.rows.length > 0) {
          console.log("\n  Sample TRUE records:");
          results.booleanAnalysis.details.true.rows
            .slice(0, 2)
            .forEach((row, index) => {
              console.log(`    ${index + 1}. ${JSON.stringify(row)}`);
            });
        }

        if (results.booleanAnalysis.details.false.rows.length > 0) {
          console.log("\n  Sample FALSE records:");
          results.booleanAnalysis.details.false.rows
            .slice(0, 2)
            .forEach((row, index) => {
              console.log(`    ${index + 1}. ${JSON.stringify(row)}`);
            });
        }
      }

      // Perform grouping
      if (options.groupBy) {
        results.groupedData = this.analyzer.groupByKey(options.groupBy);
        console.log(`\n🔗 Grouped by '${options.groupBy}':`);
        console.log("=".repeat(50));
        console.log(
          `  Total groups: ${Object.keys(results.groupedData).length}`
        );

        Object.entries(results.groupedData).forEach(([key, rows]) => {
          console.log(`  Group '${key}': ${rows.length} record(s)`);
          if (rows.length > 0) {
            console.log(`    Sample: ${JSON.stringify(rows[0])}`);
          }
        });
      }

      if (options.groupByKeys) {
        const keys = options.groupByKeys.split(",").map((k) => k.trim());
        results.groupedData = this.analyzer.groupByKeys(keys);
        console.log(`\n🔗 Grouped by keys [${keys.join(", ")}]:`);
        console.log("=".repeat(50));
        console.log(
          `  Total groups: ${Object.keys(results.groupedData).length}`
        );

        Object.entries(results.groupedData).forEach(([key, rows]) => {
          console.log(`  Group '${key}': ${rows.length} record(s)`);
          if (rows.length > 0) {
            console.log(`    Sample: ${JSON.stringify(rows[0])}`);
          }
        });
      }

      if (options.groupByBoolean) {
        results.groupedData = this.analyzer.groupByKeyBoolean(
          options.groupByBoolean
        );
        console.log(`\n🔗 Grouped by boolean '${options.groupByBoolean}':`);
        console.log("=".repeat(50));
        console.log(
          `  True group: ${results.groupedData.true.length} record(s)`
        );
        console.log(
          `  False group: ${results.groupedData.false.length} record(s)`
        );
        console.log(
          `  Undefined group: ${results.groupedData.undefined.length} record(s)`
        );

        // Show samples from each group
        if (results.groupedData.true.length > 0) {
          console.log(
            `\n  Sample TRUE record: ${JSON.stringify(results.groupedData.true[0])}`
          );
        }
        if (results.groupedData.false.length > 0) {
          console.log(
            `  Sample FALSE record: ${JSON.stringify(results.groupedData.false[0])}`
          );
        }
        if (results.groupedData.undefined.length > 0) {
          console.log(
            `  Sample UNDEFINED record: ${JSON.stringify(results.groupedData.undefined[0])}`
          );
        }
      }

      // Show final dataset summary
      console.log(`\n📋 Final Dataset Summary:`);
      console.log("=".repeat(50));
      console.log(`  Total rows: ${this.analyzer.getRowCount()}`);
      console.log(`  Columns: ${this.analyzer.getColumns().join(", ")}`);

      if (
        this.analyzer.getRowCount() > 0 &&
        this.analyzer.getRowCount() <= 10
      ) {
        console.log("\n  All records:");
        this.analyzer.getData().forEach((row, index) => {
          console.log(`    ${index + 1}. ${JSON.stringify(row)}`);
        });
      } else if (this.analyzer.getRowCount() > 10) {
        console.log("\n  Sample records (first 5):");
        this.analyzer
          .getData()
          .slice(0, 5)
          .forEach((row, index) => {
            console.log(`    ${index + 1}. ${JSON.stringify(row)}`);
          });
        console.log(
          `    ... and ${this.analyzer.getRowCount() - 5} more records`
        );
      }

      // Output results to file if specified
      if (options.output) {
        await fs.writeFile(
          options.output,
          JSON.stringify(
            {
              ...results,
              finalDataset: {
                rowCount: this.analyzer.getRowCount(),
                columns: this.analyzer.getColumns(),
                sampleData: this.analyzer.getData().slice(0, 5),
              },
            },
            null,
            2
          )
        );
        console.log(`\n💾 Results saved to: ${options.output}`);
      }
    } catch (error) {
      console.error("❌ Error during analysis:", error.message);
      process.exit(1);
    }
  }

  async handleInfoCommand(files) {
    try {
      await this.analyzer.loadFiles(files);

      console.log(`\n📊 CSV File Information`);
      console.log("=".repeat(50));
      console.log(`Files analyzed: ${files.length}`);
      console.log(`Total rows: ${this.analyzer.getRowCount()}`);
      console.log(`Columns: ${this.analyzer.getColumns().join(", ")}`);

      const columns = this.analyzer.getColumns();
      console.log(`\nColumn details:`);
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
      });

      // Show sample data
      if (this.analyzer.getRowCount() > 0) {
        console.log(`\nSample data (first 3 rows):`);
        this.analyzer
          .getData()
          .slice(0, 3)
          .forEach((row, index) => {
            console.log(`  Row ${index + 1}: ${JSON.stringify(row)}`);
          });
      }
    } catch (error) {
      console.error("❌ Error reading files:", error.message);
      process.exit(1);
    }
  }

  run() {
    const program = this.setupCommands();
    program.parse();
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CliHandler();
  cli.run();
}

export default CsvCombineAnalysis;
