using System.Net;
using System.Text.Json;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Application.Exceptions;
using Serilog;

namespace TimDoLeLe.Middlewares
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
                Log.Error(ex, "Erro capturado pelo middleware");

                context.Response.ContentType = "application/json";

                var statusCode = ex switch
                {
                    BadRequestException => (int)HttpStatusCode.BadRequest,
                    NotFoundException => (int)HttpStatusCode.NotFound,
                    _ => (int)HttpStatusCode.InternalServerError
                };

                context.Response.StatusCode = statusCode;

                var response = ApiResponse<string>.Fail(ex.Message);

                await context.Response.WriteAsync(
                    JsonSerializer.Serialize(response)
                );
            }
        }
    }
}