package com.example.sqsbatch.consumer;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSBatchResponse;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParameterRequest;
import software.amazon.lambda.powertools.batch.BatchMessageHandlerBuilder;
import software.amazon.lambda.powertools.batch.handler.BatchMessageHandler;
import software.amazon.lambda.powertools.idempotency.Idempotency;
import software.amazon.lambda.powertools.idempotency.IdempotencyConfig;
import software.amazon.lambda.powertools.idempotency.persistence.dynamodb.DynamoDBPersistenceStore;

public class ConsumerHandler implements RequestHandler<SQSEvent, SQSBatchResponse> {

    private final BatchMessageHandler<SQSEvent, SQSBatchResponse> handler;
    private final SsmClient ssmClient = SsmClient.create();

    public ConsumerHandler() {
        Idempotency.config()
                .withPersistenceStore(
                        DynamoDBPersistenceStore.builder()
                                .withTableName(System.getenv("IDEMPOTENCY_TABLE_NAME"))
                                .build()
                )
                .withConfig(
                        IdempotencyConfig.builder()
                                .withEventKeyJMESPath("messageId")
                                .build()
                )
                .configure();

        handler = new BatchMessageHandlerBuilder()
                .withSqsBatchHandler()
                .buildWithRawMessageHandler(this::processMessage);
    }

    @Override
    public SQSBatchResponse handleRequest(SQSEvent event, Context context) {
        Idempotency.registerLambdaContext(context);
        return handler.processBatch(event, context);
    }

    private void processMessage(SQSEvent.SQSMessage message, Context context) {
        Idempotency.makeIdempotent(this::process, message, String.class);
    }

    private String process(SQSEvent.SQSMessage message) {
        String body = message.getBody();
        System.out.println("Processing message: " + body);

        if (body != null && body.contains("SIMULATE_FAILURE") && isFailureSwitchOn()) {
            throw new RuntimeException("Simulated failure for testing partial batch response");
        }

        return "OK";
    }

    private boolean isFailureSwitchOn() {
        String value = ssmClient.getParameter(GetParameterRequest.builder()
                .name(System.getenv("FAILURE_SWITCH_PARAM_NAME"))
                .build()).parameter().value();
        return "ON".equals(value);
    }
}
