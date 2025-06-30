# Advanced CSV Analysis CLI

A powerful command-line tool for analyzing, filtering, grouping, and transforming data within CSV files. Process single or multiple files, chain operations, and export results to JSON.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Commands](#commands)
  - [Options](#options)
- [Examples](#examples)
  - [1. Basic Operations](#1-basic-operations)
  - [2. Filtering and Selecting Data](#2-filtering-and-selecting-data)
  - [3. Grouping and Aggregation](#3-grouping-and-aggregation)
  - [4. Specialized Analysis](#4-specialized-analysis)
- [Real-World Scenarios](#real-world-scenarios)
  - [Comprehensive User Analysis](#comprehensive-user-analysis)
  - [Multi-step Order Pipeline](#multi-step-order-pipeline)
  - [Sales Performance Report](#sales-performance-report)
- [Advanced Tips](#advanced-tips)
  - [Analyzing Multiple Files](#analyzing-multiple-files)
  - [Working with Large Datasets](#working-with-large-datasets)

## Features

- **Analyze Multiple Files**: Process and combine data from several CSV files at once.
- **Data Filtering**: Keep only rows that have values in specified columns.
- **Column Selection**: Pluck specific columns to create a smaller, focused dataset.
- **Deduplication**: Remove duplicate rows based on one or more column values.
- **Powerful Grouping**: Group data by single columns, multiple columns, or boolean values.
- **Date Analysis**: Automatically calculate "days since" for any date column.
- **Boolean Analysis**: Quickly count `true`/`false` values in boolean-like columns.
- **JSON Output**: Save the structured results of your analysis to a `.json` file.

## Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/carlosmarte/tools-csv-auditor.git
    cd tools-csv-auditor
    ```

2.  Install dependencies (if any):
    ```bash
    npm install
    ```

## Domain
  `curl -L https://api.github.com/repos/carlosmarte/tools-csv-auditor/tarball/main | tar -xz --strip-components=1 --wildcards '*/NodeJs/*'`

## Usage

The tool is invoked via `node main.mjs` followed by a command, options, and file paths.

```bash
node main.mjs <command> [files...] [options...]
```

### Commands

| Command   | Description                                         |
| :-------- | :-------------------------------------------------- |
| `analyze` | Runs an analysis pipeline on one or more CSV files. |
| `info`    | Displays basic information about a CSV file.        |
| `--help`  | Shows the help message with all available options.  |

### Options

| Flag                 | Alias | Argument    | Description                                                                         |
| :------------------- | :---- | :---------- | :---------------------------------------------------------------------------------- |
| `--date-column`      | `-d`  | `<column>`  | Analyze a date column for "days since" calculation.                                 |
| `--boolean-column`   | `-b`  | `<column>`  | Analyze a boolean column for true/false counts.                                     |
| `--filter`           | `-f`  | `<columns>` | Filter rows, keeping only those with data in the specified comma-separated columns. |
| `--pluck`            | `-p`  | `<columns>` | Select only the specified comma-separated columns.                                  |
| `--dedupe`           |       | `<columns>` | Remove duplicate rows based on the specified comma-separated columns.               |
| `--group-by`         |       | `<key>`     | Group data by a single column key.                                                  |
| `--group-by-keys`    |       | `<keys>`    | Group data by multiple comma-separated column keys.                                 |
| `--group-by-boolean` |       | `<key>`     | Group data by a boolean column's `true`/`false` values.                             |
| `--output`           | `-o`  | `<file>`    | Save the analysis results to a JSON file.                                           |

---

## Examples

### 1. Basic Operations

**Get help on all available commands and options:**

```bash
node main.mjs --help
```

**Show information about a file (row count, headers):**

```bash
node main.mjs info orders.csv
```

**Run a default analysis on one or more files:**

```bash
node main.mjs analyze data1.csv data2.csv
```

### 2. Filtering and Selecting Data

**Keep only rows that have a `user_id` AND `amount`:**

```bash
node main.mjs analyze orders.csv --filter "user_id,amount"
```

**Select only the `user_id` and `amount` columns:**

```bash
node main.mjs analyze orders.csv --pluck "user_id,amount"
```

**Remove duplicate orders based on the `user_id`:**

```bash
node main.mjs analyze orders.csv --dedupe "user_id"
```

**Chain operations: Filter for essential data, then pluck columns, then deduplicate by email.**

```bash
node main.mjs analyze users.csv \
  --filter "name,email" \
  --pluck "id,name,email" \
  --dedupe "email"
```

### 3. Grouping and Aggregation

**Group users by their `department`:**

```bash
node main.mjs analyze users.csv --group-by department
```

**Group orders by `region` and `completed` status:**

```bash
node main.mjs analyze orders.csv --group-by-keys "region,completed"
```

**Group orders into `completed` vs. `not-completed` buckets:**

```bash
node main.mjs analyze orders.csv --group-by-boolean completed
```

### 4. Specialized Analysis

**Calculate "days since" for the `created_at` column:**

```bash
node main.mjs analyze users.csv --date-column created_at
```

**Analyze active vs. inactive users from the `is_active` column:**

```bash
node main.mjs analyze users.csv --boolean-column is_active
```

---

## Real-World Scenarios

Combine flags to create powerful analysis pipelines.

### Comprehensive User Analysis

This command analyzes user signups, activity, and groups them by department, saving the result.

```bash
node main.mjs analyze users.csv \
  --date-column created_at \
  --boolean-column is_active \
  --group-by department \
  --output user_analysis.json
```

_This performs the following steps:_

1.  Calculates days since `created_at` for each user.
2.  Counts `is_active` vs. inactive users.
3.  Groups the final data by `department`.
4.  Saves the complete analysis to `user_analysis.json`.

### Multi-step Order Pipeline

Filter orders, analyze key metrics, and deduplicate to get a clean dataset.

```bash
node main.mjs analyze orders.csv \
  --filter "amount,order_date" \
  --date-column order_date \
  --boolean-column completed \
  --dedupe "user_id" \
  --group-by region \
  --output order_pipeline.json
```

_This performs the following steps:_

1.  Filters out orders missing an `amount` or `order_date`.
2.  Calculates days since `order_date`.
3.  Analyzes `completed` status rates.
4.  Removes duplicate orders, keeping only the first one per `user_id`.
5.  Groups the cleaned data by `region`.
6.  Saves the results to `order_pipeline.json`.

### Sales Performance Report

Analyze sales data from multiple quarterly files and group by region and quarter.

```bash
node main.mjs analyze sales_q1.csv sales_q2.csv \
  --date-column sale_date \
  --boolean-column target_met \
  --group-by-keys "region,quarter" \
  --output sales_performance.json
```

## Advanced Tips

### Analyzing Multiple Files

Simply list all files you want to process. The tool will concatenate them before running the analysis.

```bash
node main.mjs analyze users.csv orders.csv \
  --filter "name,amount" \
  --group-by region \
  --output combined_analysis.json
```

> **Note**: Ensure the columns you operate on (e.g., `region`) exist in all files. Use `--pluck` to standardize columns if needed.

### Working with Large Datasets

For very large files, performance can be improved by reducing the dataset as early as possible in the chain.

```bash
# Filter and pluck first to reduce memory usage before more complex operations
node main.mjs analyze large_dataset.csv \
  --filter "essential_column" \
  --pluck "id,name,key_metric" \
  --dedupe "id"
```
