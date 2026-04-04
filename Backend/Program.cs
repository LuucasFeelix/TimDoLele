using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using TimDoLele.Application.Services;
using TimDoLele.Infrastructure.Data;
using Serilog;
using TimDoLeLe.Middlewares;

namespace TimDoLeLe
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // 🔥 CONFIG SERILOG
            Log.Logger = new LoggerConfiguration()
                .WriteTo.Console()
                .WriteTo.File("logs/log.txt", rollingInterval: RollingInterval.Day)
                .CreateLogger();

            try
            {
                var builder = WebApplication.CreateBuilder(args);

                builder.Host.UseSerilog(); // 🔥 ativa serilog

                var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]);

                // Controllers
                builder.Services.AddControllers();

                // Swagger + JWT 🔐
                builder.Services.AddEndpointsApiExplorer();
                builder.Services.AddSwaggerGen(c =>
                {
                    c.SwaggerDoc("v1", new OpenApiInfo
                    {
                        Title = "TimDoLele API",
                        Version = "v1"
                    });

                    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                    {
                        Description = "Digite: Bearer SEU_TOKEN_AQUI",
                        Name = "Authorization",
                        In = ParameterLocation.Header,
                        Type = SecuritySchemeType.ApiKey,
                        Scheme = "Bearer"
                    });

                    c.AddSecurityRequirement(new OpenApiSecurityRequirement
                    {
                        {
                            new OpenApiSecurityScheme
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.SecurityScheme,
                                    Id = "Bearer"
                                }
                            },
                            new string[] {}
                        }
                    });
                });

                // Services
                builder.Services.AddScoped<PedidoService>();
                builder.Services.AddScoped<AuthService>();

                // DbContext
                builder.Services.AddDbContext<TimDoLeleDbContext>(options =>
                    options.UseSqlServer(
                        builder.Configuration.GetConnectionString("DefaultConnection")));

                // 🔐 JWT
                builder.Services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = false;
                    options.SaveToken = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateIssuerSigningKey = true,
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(key)
                    };
                });

                builder.Services.AddAuthorization();

                var app = builder.Build();

                // Swagger
                if (app.Environment.IsDevelopment())
                {
                    app.UseSwagger();
                    app.UseSwaggerUI(c =>
                    {
                        c.SwaggerEndpoint("/swagger/v1/swagger.json", "TimDoLele API");
                        c.RoutePrefix = string.Empty;
                    });
                }

                app.UseHttpsRedirection();

                app.UseAuthentication();
                app.UseAuthorization();

                // 🔥 MIDDLEWARE GLOBAL DE ERRO
                app.UseMiddleware<ErrorHandlingMiddleware>();

                app.MapControllers();

                app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Erro fatal ao iniciar a aplicação");
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }
    }
}