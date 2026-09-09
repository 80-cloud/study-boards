package com.example.outbox.relay;

import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.StreamsEventResponse;
import com.amazonaws.xray.interceptors.TracingInterceptor;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class RelayHandler implements RequestHandler<DynamodbEvent, StreamsEventResponse> {

    private final SqsClient sqsClient = SqsClient.builder()
            .overrideConfiguration(ClientOverrideConfiguration.builder()
                    .addExecutionInterceptor(new TracingInterceptor())
                    .build())
            .build();

    private final String queueUrl = System.getenv("QUEUE_URL");

    @Override
    public StreamsEventResponse handleRequest(DynamodbEvent event, Context context) {
        List<StreamsEventResponse.BatchItemFailure> batchItemFailures = new ArrayList<>();

        for (DynamodbEvent.DynamodbStreamRecord record : event.getRecords()) {
            String sequenceNumber = record.getDynamodb().getSequenceNumber();
            try {
                processRecord(record, context);
            } catch (Exception e) {
                context.getLogger().log("Failed to relay record " + sequenceNumber + ": " + e.getMessage());
                // Streamsは失敗地点から丸ごと再試行されるので、その場で打ち切って返す
                batchItemFailures.add(new StreamsEventResponse.BatchItemFailure(sequenceNumber));
                return new StreamsEventResponse(batchItemFailures);
            }
        }

        return new StreamsEventResponse();
    }

    private void processRecord(DynamodbEvent.DynamodbStreamRecord record, Context context) {
        String eventName = record.getEventName();
        String streamEventId = record.getEventID();

        Map<String, AttributeValue> keys = record.getDynamodb().getKeys();
        Map<String, AttributeValue> newImage = record.getDynamodb().getNewImage();

        String orderId = (keys != null && keys.get("orderId") != null) ? keys.get("orderId").getS() : null;
        String businessEventId = (newImage != null && newImage.get("eventId") != null)
                ? newImage.get("eventId").getS() : null;

        String body = String.format(
                "{\"streamEventId\":\"%s\",\"eventId\":\"%s\",\"eventName\":\"%s\",\"orderId\":\"%s\"}",
                streamEventId, businessEventId, eventName, orderId
        );

        context.getLogger().log("Relaying to SQS: " + body);

        sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(body)
                .build());
    }
}
