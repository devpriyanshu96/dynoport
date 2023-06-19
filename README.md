\
Dynoport
==========

[![npm version](https://badge.fury.io/js/dynoport.svg)](https://badge.fury.io/js/dynoport) ![npm](https://img.shields.io/npm/:dt/:/:dynoport)


Dynoport is a CLI tool that allows you to easily import and export data from a specified DynamoDB table. It provides a convenient way to transfer data between DynamoDB and JSON files.

## Installation

To install Dynoport, use the following command:

Copy code

`npm install -g dynoport`

## Usage

Dynoport supports two modes: export and import. Here's how you can use each mode:

### Export Mode

In export mode, Dynoport exports the data from a DynamoDB table and saves it as a JSON file.

`dynoport --table <tableName> --filePath <outputFilePath> --mode export -region eu-west-1`

- `<tableName>`: The name of the DynamoDB table you want to export.
- `<outputFilePath>`: The path where the JSON file will be saved.
- `<region>`: Specify the aws region to use.

Example:

`dynoport --table myTable --filePath ./data.json --mode export --region us-east-1`

This command will export the data from the "myTable" DynamoDB table and save it as a JSON file at "./data.json".

### Import Mode

In import mode, Dynoport imports data from a JSON file and inserts it into a specified DynamoDB table.

`dynoport --table <tableName> --filePath <inputFilePath> --mode import --region us-east-1`

- `<tableName>`: The name of the DynamoDB table where you want to import the data.
- `<inputFilePath>`: The path to the JSON file containing the data to be imported.
- `<region>`: Specify the aws region to use.

Example:

`dynoport --table myTable --filePath ./data.json --mode import`

This command will import the data from the "./data.json" file and insert it into the "myTable" DynamoDB table.

## Additional Notes

- The AWS credentials and region should be properly configured on your system before using Dynoport. Refer to the AWS documentation for more information on configuring credentials.

- The DynamoDB table specified should exist and be accessible with the provided credentials.

- The exported JSON file will be created or appended to if it already exists.

- During import, the JSON file should contain an array of objects, where each object represents a record to be inserted into the DynamoDB table.

- For large datasets, the import operation is batched to ensure efficient processing. The batch size can be adjusted using the `chunkSize` variable in the code.

## Version

Dynoport version: 1.0.0

## License

This project is licensed under the MIT License
