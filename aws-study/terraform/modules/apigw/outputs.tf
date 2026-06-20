output "api_url" { value = aws_apigatewayv2_stage.default.invoke_url }
output "api_host" { value = replace(aws_apigatewayv2_api.this.api_endpoint, "https://", "") }
