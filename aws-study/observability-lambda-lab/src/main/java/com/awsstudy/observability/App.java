package com.awsstudy.observability;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;

import java.util.HashMap;
import java.util.Map;

public class App implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
        context.getLogger().log("Handling request. RequestId=" + context.getAwsRequestId());

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");

        String body = "{\"message\": \"Hello from observability lab\", \"requestId\": \""
                + context.getAwsRequestId() + "\"}";

        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withHeaders(headers)
                .withBody(body);
    }
}
