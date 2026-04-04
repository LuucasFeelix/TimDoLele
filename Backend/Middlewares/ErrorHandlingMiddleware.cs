using System.Net;
using System.Text.Json;
using TimDoLele.Application.DTOs.Common;

namespace TimDoLele.Middlewares
{
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;

        public ErrorHandlingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                context.Response.ContentType = "application/json";

                var response = ApiResponse<string>.Fail(ex.Message);

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            }
        }

    }
}
