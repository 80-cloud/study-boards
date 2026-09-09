const AWSXRay = require("aws-xray-sdk-core");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const db = DynamoDBDocumentClient.from(
  AWSXRay.captureAWSv3Client(new DynamoDBClient({}))
);

const tableName = process.env.FLIGHT_BOOKINGS_TABLE_NAME;

/**
 * Sample Lambda function which mocks the operation of inserting item on DynamoDb by checking if the item exist
 * and update it if not it insert a new one
 *
 * @param {Object} event - Input event to the Lambda function
 * @param {Object} context - Lambda Context runtime methods and attributes
 *
 * @returns {Object} object - Object containing the current price of the stock
 *
 */
exports.lambdaHandler = async (event, context) => {
  console.info("received:", event);
  let response = null;
  const tripId = event.tripId || event[0].tripId || undefined;

  if (tripId === null || tripId === undefined) {
    response = {
      statusCode: 500,
      body: JSON.stringify({
        bookFlightSuccess: false,
        error: "Book Flight Error",
      }),
    };
  }

  if (response === null) {
    const dbData = await db.send(
      new GetCommand({
        TableName: tableName,
        Key: { tripId: tripId },
      })
    );

    const dbItem = Object.assign(dbData.Item || {}, {
      tripId: tripId,
      status: "CANCELLED",
    });

    await db.send(
      new PutCommand({
        TableName: tableName,
        Item: dbItem,
      })
    );

    response = {
      statusCode: 200,
      body: JSON.stringify(dbItem),
    };
  }

  // All log statements are written to CloudWatch
  console.info(
    `response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`
  );

  return response;
};
