```markdown:README.md
# <img src="https://i.imgur.com/qYeuhfG.png" width="30" height="30" title="Dynoport"> Dynoport 🚀

[![npm version](https://badge.fury.io/js/dynoport.svg)](https://badge.fury.io/js/dynoport) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/axios?style=flat-square)](https://bundlephobia.com/package/dynoport@latest)
[![npm downloads](https://img.shields.io/npm/dm/dynoport.svg?style=flat-square)](https://npm-stat.com/charts.html?package=dynoport)

Dynoport is a CLI tool that allows you to easily import and export data from a specified DynamoDB table. It provides a convenient way to transfer data between DynamoDB and JSON files.

## ✨ Features

- 📤 **Export** DynamoDB tables to JSON files with real-time progress tracking
- 📥 **Import** JSON data back into DynamoDB tables with optimized batch processing
- 🧙‍♂️ **Wizard Mode** for guided, interactive operation
- 📊 Detailed metrics and comprehensive error reporting
- ⚡ Parallel batch processing for maximum performance
- 🌐 Support for all AWS regions

## 🛠️ Installation

To install Dynoport, use the following command:

```

npm install -g dynoport

```

## 📋 Usage

Dynoport supports three modes: wizard, export and import.

### 🧙‍♂️ Wizard Mode (Recommended)

The easiest way to use Dynoport is through the interactive wizard:

```

dynoport

```

or

```

dynoport --mode wizard

```

The wizard will guide you through:
1. Selecting operation type (export/import)
2. Choosing AWS region
3. Selecting source/target tables
4. Configuring file paths
5. Confirming and executing the operation

### 📤 Export Mode

In export mode, Dynoport exports the data from a DynamoDB table and saves it as a JSON file.

```

dynoport --table <tableName> --filePath <outputFilePath> --mode export --region eu-west-1

```

- `<tableName>`: The name of the DynamoDB table you want to export.
- `<outputFilePath>`: The path where the JSON file will be saved.
- `<region>`: Specify the AWS region to use.

Example:

```

dynoport --table myTable --filePath ./data.json --mode export --region us-east-1

```

This command will export the data from the "myTable" DynamoDB table and save it as a JSON file at "./data.json".

### 📥 Import Mode

In import mode, Dynoport imports data from a JSON file and inserts it into a specified DynamoDB table.

```

dynoport --table <tableName> --filePath <inputFilePath> --mode import --region us-east-1

```

- `<tableName>`: The name of the DynamoDB table where you want to import the data.
- `<inputFilePath>`: The path to the JSON file containing the data to be imported.
- `<region>`: Specify the AWS region to use.

Example:

```

dynoport --table myTable --filePath ./data.json --mode import

```

This command will import the data from the "./data.json" file and insert it into the "myTable" DynamoDB table.

### 🔍 Options

| Option | Description |
|--------|-------------|
| `-t, --table <tableName>` | DynamoDB table name |
| `-f, --filePath <filePath>` | JSON file path (for input or output) |
| `-r, --region <region>` | AWS region (defaults to us-east-1) |
| `-m, --mode <mode>` | Mode: export, import, or wizard (default: wizard) |
| `-v, --version` | Show version number |
| `-h, --help` | Display help |

## 📊 Performance

Dynoport uses intelligent batch processing and parallel operations to optimize throughput when working with large datasets. The tool provides:

- ⏱️ Real-time progress indicators
- 📈 Detailed success/failure reporting
- 🔄 Automatic pagination for large tables
- 📦 Optimized batch sizes for maximum throughput

## 💻 Example Output

When running an export operation, you'll see detailed progress information:

```

╔═══════════════════════════════════════════╗
║ ║
║ DYNOPORT ║
║ CLI Tool v1.0.0 ║
╚═══════════════════════════════════════════╝

✓ Table info: ~1,250 items, 3.45 MB
⠋ Exporting table 'users' to './users-backup.json'...
✓ Batch #1: Retrieved 100 items (total: 100)
✓ Wrote 100 items to file
✓ Batch #2: Retrieved 100 items (total: 200)
✓ Wrote 100 items to file
...
✓ ✨ Export completed successfully!

┌─────────────────────────────────────────┐
│ EXPORT SUMMARY │
├─────────────────────────────────────────┤
│ Table: users │
│ Items: 1250 │
│ Output: users-backup.json │
│ Time taken: 2m 15s │
└─────────────────────────────────────────┘

```

## 🔐 AWS Credentials

The AWS credentials and region should be properly configured on your system before using Dynoport. Refer to the AWS documentation for more information on configuring credentials.

You can configure your AWS credentials in several ways:
- AWS credentials file (~/.aws/credentials)
- Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- IAM roles for Amazon EC2 instances

## 🧩 Additional Notes

- The DynamoDB table specified should exist and be accessible with the provided credentials.

- The exported JSON file will be created or appended to if it already exists.

- During import, the JSON file should contain valid JSON objects, where each object represents a record to be inserted into the DynamoDB table.

- For large datasets, the import operation is batched to ensure efficient processing.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License

## 🔢 Version

Dynoport version: 1.0.0
```
