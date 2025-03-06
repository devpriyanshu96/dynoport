/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Command } from 'commander';
// eslint-disable-next-line node/no-extraneous-import
import AWS from 'aws-sdk';
import fs from 'fs';
import readline from 'readline';
import * as ndjson from 'ndjson';
import { log } from 'console';
import loChunk from 'lodash/chunk';
import * as bluebird from 'bluebird';
import { createSpinner } from './spinner-helper';
import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';

const packageJson = require('../package.json');
const version: string = packageJson.version;

const program = new Command();

program
  .version(version)
  .name('dynamo-tool')
  .option('-t, --table <tableName>', 'DynamoDB table name')
  .option('-f, --filePath <filePath>', 'Output JSON file path')
  .option('-r, --region <region>', 'AWS region to use')
  .option('-m, --mode <mode>', 'Mode [export|import|wizard]', 'wizard')
  .parse(process.argv);

// Helper function to format elapsed time
function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Display ASCII art logo
function displayLogo() {
  console.log(
    chalk.cyan(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║                                           ║
  ║                                           ║
  ║              DYNOPORT                     ║
  ║                                           ║
  ║                                           ║
  ║                                           ║
  ║   CLI Tool v${version.padEnd(27)}║
  ╚═══════════════════════════════════════════╝
  `)
  );
}

async function exportTableToJson(
  tableName: string,
  outputFilePath: string,
  region: string
) {
  const mainSpinner = createSpinner(
    `Preparing to export table '${tableName}'...`
  ).start();
  const startTime = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const dynamodb = new AWS.DynamoDB.DocumentClient({ region });

  // Get table info for reporting
  try {
    const dynamodbRaw = new AWS.DynamoDB({ region });
    const tableInfo = await dynamodbRaw
      .describeTable({ TableName: tableName })
      .promise();
    const itemCount = tableInfo.Table?.ItemCount || 0;
    const tableSizeBytes = tableInfo.Table?.TableSizeBytes || 0;
    const tableSizeMB = (tableSizeBytes / (1024 * 1024)).toFixed(2);

    mainSpinner.info(
      `Table info: ~${itemCount.toLocaleString()} items, ${tableSizeMB} MB`
    );
  } catch (error) {
    mainSpinner.info('Could not retrieve table size information');
  }

  mainSpinner.text = `Exporting table '${tableName}' to '${outputFilePath}'...`;

  const scanParams: AWS.DynamoDB.DocumentClient.ScanInput = {
    TableName: tableName,
  };

  let totalCount = 0;
  const outputStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
  let progressSpinner = createSpinner('Scanning items...').start();

  try {
    let batchNumber = 1;
    do {
      progressSpinner.text = `Batch #${batchNumber}: Scanning items...`;
      const scanResult = await dynamodb.scan(scanParams).promise();
      scanParams.ExclusiveStartKey = scanResult.LastEvaluatedKey;

      const batchCount = scanResult.Items?.length || 0;
      totalCount += batchCount;

      progressSpinner.succeed(
        `Batch #${batchNumber}: Retrieved ${batchCount} items (total: ${totalCount})`
      );

      if (scanResult.Items && scanResult.Items.length > 0) {
        const writeSpinner = createSpinner(
          `Writing ${batchCount} items to file...`
        ).start();
        scanResult.Items.forEach(item => {
          const timestampedObj = { ...item };
          const jsonString = JSON.stringify(timestampedObj);
          outputStream.write(jsonString + '\n');
        });
        writeSpinner.succeed(`Wrote ${batchCount} items to file`);
      }

      if (scanParams.ExclusiveStartKey) {
        batchNumber++;
        progressSpinner = createSpinner(
          `Batch #${batchNumber}: Scanning items...`
        ).start();
      }
    } while (scanParams.ExclusiveStartKey);

    outputStream.end();

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const elapsedTimeFormatted = formatElapsedTime(Date.now() - startTime);

    mainSpinner.succeed(chalk.green('✨ Export completed successfully!'));

    // Summary box
    console.log(chalk.cyan('\n┌─────────────────────────────────────────┐'));
    console.log(chalk.cyan('│           EXPORT SUMMARY                │'));
    console.log(chalk.cyan('├─────────────────────────────────────────┤'));
    console.log(
      chalk.cyan(`│ Table:       ${tableName.substring(0, 27).padEnd(27)} │`)
    );
    console.log(
      chalk.cyan(`│ Items:       ${totalCount.toString().padEnd(27)} │`)
    );
    console.log(
      chalk.cyan(
        `│ Output:      ${path
          .basename(outputFilePath)
          .substring(0, 27)
          .padEnd(27)} │`
      )
    );
    console.log(
      chalk.cyan(`│ Time taken:  ${elapsedTimeFormatted.padEnd(27)} │`)
    );
    console.log(chalk.cyan('└─────────────────────────────────────────┘\n'));
  } catch (error) {
    progressSpinner.fail('Error exporting DynamoDB table:');
    console.error(chalk.red(error));
    mainSpinner.fail(chalk.red('Export failed!'));
  }
}

interface Item {
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/require-await
async function importJsonToTable(
  tableName: string,
  filePath: string,
  region: string
) {
  const mainSpinner = createSpinner(
    `Preparing to import data to '${tableName}'...`
  ).start();
  const startTime = Date.now();

  // Get file size for reporting
  try {
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    mainSpinner.info(`File info: ${fileSizeMB} MB`);
  } catch (error) {
    mainSpinner.info('Could not retrieve file size information');
  }

  mainSpinner.text = `Importing JSON from '${filePath}' to table '${tableName}'...`;

  // Create an AWS DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region });

  // Read the NDJSON file
  const fileStream = fs.createReadStream(filePath);

  // Parse the NDJSON data
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const parser = ndjson.parse();

  // Chunk size for parallel requests
  const chunkSize = 25; // Adjust this as needed

  // Array to hold batch write requests
  const writeRequests: AWS.DynamoDB.DocumentClient.WriteRequest[] = [];

  let itemCount = 0;
  let successCount = 0;
  let errorCount = 0;

  // Event handler for each parsed item
  // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
  parser.on('data', async (item: Item) => {
    itemCount++;
    // Create a new batch write request for each item
    writeRequests.push({
      PutRequest: {
        Item: item,
      },
    });

    if (itemCount % 1000 === 0) {
      mainSpinner.text = `Reading data: ${itemCount.toLocaleString()} items processed...`;
    }
  });

  // Event handler for the end of the file
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  parser.on('end', async () => {
    mainSpinner.succeed(`Read ${itemCount.toLocaleString()} items from file`);

    let progressSpinner = createSpinner(
      `Preparing to write ${itemCount} items to DynamoDB...`
    ).start();

    // Execute any remaining batch write requests
    let batch = 0;
    try {
      const totalChunks = Math.ceil(writeRequests.length / 500);
      for await (const chunkedWriteRequest of loChunk(writeRequests, 500)) {
        batch++;
        progressSpinner.text = `Processing batch ${batch}/${totalChunks} (${chunkedWriteRequest.length} items)`;

        const writeRequestsPrime = loChunk(chunkedWriteRequest, 25);
        const totalBatches = writeRequestsPrime.length;
        let processedBatch = 0;

        await bluebird.Promise.map(
          writeRequestsPrime,
          async (writeRequestPrime: any) => {
            processedBatch++;
            if (processedBatch % 5 === 0) {
              progressSpinner.text = `Batch ${batch}/${totalChunks}: Writing sub-batch ${processedBatch}/${totalBatches}`;
            }

            const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
              RequestItems: {
                [tableName]: writeRequestPrime,
              },
            };

            try {
              const result = await dynamoDB.batchWrite(params).promise();
              // Count successful items
              const unprocessedItems =
                result.UnprocessedItems?.[tableName]?.length || 0;
              successCount += writeRequestPrime.length - unprocessedItems;
              errorCount += unprocessedItems;
            } catch (err) {
              errorCount += writeRequestPrime.length;
              console.error(
                chalk.red(`Error in batch: ${(err as any).message}`)
              );
            }
          },
          { concurrency: 5 }
        );

        progressSpinner.succeed(`Completed batch ${batch}/${totalChunks}`);
        if (batch < totalChunks) {
          progressSpinner = createSpinner(
            `Processing batch ${batch + 1}/${totalChunks}...`
          ).start();
        }
      }

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      const elapsedTimeFormatted = formatElapsedTime(Date.now() - startTime);

      mainSpinner.succeed(chalk.green('✨ Import completed!'));

      // Summary box
      console.log(chalk.cyan('\n┌─────────────────────────────────────────┐'));
      console.log(chalk.cyan('│           IMPORT SUMMARY                │'));
      console.log(chalk.cyan('├─────────────────────────────────────────┤'));
      console.log(
        chalk.cyan(`│ Table:       ${tableName.substring(0, 27).padEnd(27)} │`)
      );
      console.log(
        chalk.cyan(`│ Total items: ${itemCount.toString().padEnd(27)} │`)
      );
      console.log(
        chalk.cyan(`│ Successful:  ${successCount.toString().padEnd(27)} │`)
      );
      console.log(
        chalk.cyan(`│ Failed:      ${errorCount.toString().padEnd(27)} │`)
      );
      console.log(
        chalk.cyan(`│ Time taken:  ${elapsedTimeFormatted.padEnd(27)} │`)
      );
      console.log(chalk.cyan('└─────────────────────────────────────────┘\n'));
    } catch (err) {
      progressSpinner.fail(`Bulk write failed: ${err}`);
      mainSpinner.fail(chalk.red('Import failed!'));
    }
  });

  // Pipe the file stream through the NDJSON parser
  fileStream.pipe(parser);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function listAwsRegions(): Promise<string[]> {
  // You could fetch this from AWS SDK or use a predefined list
  return [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-central-1',
    'ap-northeast-1',
    'ap-southeast-1',
    'ap-southeast-2',
  ];
}

async function listTablesInRegion(region: string): Promise<string[]> {
  const spinner = createSpinner(
    'Fetching tables from selected region...'
  ).start();
  try {
    const dynamodb = new AWS.DynamoDB({ region });
    const result = await dynamodb.listTables({}).promise();
    spinner.succeed('Tables fetched successfully');
    return result.TableNames || [];
  } catch (error) {
    spinner.fail('Failed to fetch tables');
    console.error(error);
    return [];
  }
}

async function runWizard() {
  console.log(chalk.blue('=== DynamoDB Backup Wizard ==='));

  // Step 1: Choose operation
  const { operation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'operation',
      message: 'What would you like to do?',
      choices: [
        { name: 'Export a table to JSON file', value: 'export' },
        { name: 'Import a JSON file to a table', value: 'import' },
      ],
    },
  ]);

  const ec2 = new AWS.EC2({ region: 'us-east-1' }); // Use any region to initialize
  const response = await ec2.describeRegions({}).promise();
  // Step 2: Choose region
  const regions =
    response.Regions?.map(region => region.RegionName || '') || [];
  const { selectedRegion } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRegion',
      message: 'Select AWS region:',
      choices: regions,
    },
  ]);

  if (operation === 'export') {
    // Export workflow

    // Step 3: Choose table
    const spinner = createSpinner('Connecting to AWS...').start();
    const tables = await listTablesInRegion(selectedRegion);
    spinner.stop();

    if (tables.length === 0) {
      console.log(chalk.yellow('No tables found in the selected region.'));
      return;
    }

    const { selectedTable } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTable',
        message: 'Select DynamoDB table to export:',
        choices: tables,
      },
    ]);

    // Step 4: Choose output file
    const { outputFilePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputFilePath',
        message: 'Enter output file path:',
        default: `./${selectedTable}-backup-${
          new Date().toISOString().split('T')[0]
        }.json`,
      },
    ]);

    // Step 5: Confirm and execute
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Ready to export table '${selectedTable}' to '${outputFilePath}'?`,
        default: true,
      },
    ]);

    if (confirm) {
      await exportTableToJson(selectedTable, outputFilePath, selectedRegion);
    } else {
      console.log(chalk.yellow('Export cancelled.'));
    }
  } else {
    // Import workflow

    // Step 3: Choose input file
    const { inputFilePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputFilePath',
        message: 'Enter the path to the JSON file to import:',
        validate: input => {
          if (!fs.existsSync(input)) {
            return 'File does not exist. Please enter a valid file path.';
          }
          return true;
        },
      },
    ]);

    // Step 4: Choose target table
    const spinner = createSpinner('Connecting to AWS...').start();
    const tables = await listTablesInRegion(selectedRegion);
    spinner.stop();

    let selectedTable: string;

    if (tables.length === 0) {
      const { newTableName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newTableName',
          message:
            'No existing tables found. Enter the name of a new table to create:',
          validate: input => {
            if (!input.trim()) {
              return 'Table name cannot be empty';
            }
            return true;
          },
        },
      ]);
      selectedTable = newTableName;

      console.log(
        chalk.yellow(
          `Note: Table '${selectedTable}' does not exist yet. You may need to create it first.`
        )
      );
    } else {
      const { tableChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'tableChoice',
          message: 'Select target DynamoDB table:',
          choices: [
            ...tables,
            new inquirer.Separator(),
            { name: 'Enter a different table name', value: 'custom' },
          ],
        },
      ]);

      if (tableChoice === 'custom') {
        const { customTableName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'customTableName',
            message: 'Enter the table name:',
            validate: input => {
              if (!input.trim()) {
                return 'Table name cannot be empty';
              }
              return true;
            },
          },
        ]);
        selectedTable = customTableName;
      } else {
        selectedTable = tableChoice;
      }
    }

    // Step 5: Confirm and execute
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Ready to import data from '${inputFilePath}' to table '${selectedTable}'?`,
        default: true,
      },
    ]);

    if (confirm) {
      await importJsonToTable(selectedTable, inputFilePath, selectedRegion);
    } else {
      console.log(chalk.yellow('Import cancelled.'));
    }
  }
}

// Display the logo at the start
displayLogo();

const { table, filePath, mode, region } = program.opts();

if (mode === 'wizard' || (!mode && !table && !filePath)) {
  // Run in wizard mode if explicitly selected or if no required parameters are provided
  void runWizard();
} else if (!table || !filePath) {
  console.error(chalk.red('Please provide the required options.'));
  program.help();
} else {
  if (mode === 'export') {
    // Export mode
    console.log(chalk.blue('Export mode selected.'));
    void exportTableToJson(table, filePath, region || 'us-east-1');
  } else if (mode === 'import') {
    // Import mode
    console.log(chalk.blue('Import mode selected.'));
    void importJsonToTable(table, filePath, region || 'us-east-1');
  } else {
    console.error(
      chalk.red(
        'Invalid mode. Please select either "export", "import", or "wizard".'
      )
    );
    program.help();
  }
}
