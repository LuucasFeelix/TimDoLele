using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;
using TimDoLele.Application.Pagamentos;
using TimDoLele.Application.Services;
using TimDoLele.Application.WhatsApp;
using TimDoLele.Application.Validators;
using TimDoLele.Infrastructure.Data;
using TimDoLeLe.Hubs;
using TimDoLeLe.Middlewares;
using TimDoLeLe.Services;

namespace TimDoLeLe
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Log.Logger = new LoggerConfiguration()
                .WriteTo.Console()
                .WriteTo.File(
                    "logs/log.txt",
                    rollingInterval: RollingInterval.Day
                )
                .CreateLogger();

            try
            {
                var builder =
                    WebApplication.CreateBuilder(args);

                builder.Host.UseSerilog();

                var jwtKey =
                    builder.Configuration["Jwt:Key"];

                if (
                    string.IsNullOrWhiteSpace(
                        jwtKey
                    )
                )
                {
                    throw new InvalidOperationException(
                        "A configuração Jwt:Key não foi encontrada. " +
                        "Em desenvolvimento ela fica no appsettings.Development.json; " +
                        "no servidor, na variável de ambiente Jwt__Key."
                    );
                }

                var key =
                    Encoding.UTF8.GetBytes(
                        jwtKey
                    );


                builder.Services
                    .AddControllers();


                builder.Services
                    .AddSignalR();


                builder.Services
                    .AddFluentValidationAutoValidation();


                builder.Services
                    .AddValidatorsFromAssemblyContaining<
                        CriarPedidoValidator
                    >();


                builder.Services
                    .AddEndpointsApiExplorer();


                builder.Services
                    .AddSwaggerGen(
                        options =>
                        {
                            options.SwaggerDoc(
                                "v1",
                                new OpenApiInfo
                                {
                                    Title =
                                        "TimDoLele API",

                                    Version =
                                        "v1",

                                    Description =
                                        "API Tim do Lelê 🍔"
                                }
                            );


                            options.AddSecurityDefinition(
                                "Bearer",
                                new OpenApiSecurityScheme
                                {
                                    Name =
                                        "Authorization",

                                    Type =
                                        SecuritySchemeType.Http,

                                    Scheme =
                                        "bearer",

                                    BearerFormat =
                                        "JWT",

                                    In =
                                        ParameterLocation.Header,

                                    Description =
                                        "Digite apenas o token"
                                }
                            );


                            options.AddSecurityRequirement(
                                new OpenApiSecurityRequirement
                                {
                                    {
                                        new OpenApiSecurityScheme
                                        {
                                            Reference =
                                                new OpenApiReference
                                                {
                                                    Type =
                                                        ReferenceType.SecurityScheme,

                                                    Id =
                                                        "Bearer"
                                                }
                                        },

                                        Array.Empty<string>()
                                    }
                                }
                            );
                        }
                    );


                builder.Services
                    .AddCors(
                        options =>
                        {
                            options.AddPolicy(
                                "AllowAngular",
                                policy =>
                                {
                                    // Sites que podem chamar a API.
                                    // Vem de "Cors:Origens" (appsettings
                                    // ou variável de ambiente no servidor).
                                    var origens =
                                        builder.Configuration
                                            .GetSection("Cors:Origens")
                                            .Get<string[]>()
                                        ?? Array.Empty<string>();

                                    policy
                                        .WithOrigins(
                                            origens
                                        )
                                        .AllowAnyHeader()
                                        .AllowAnyMethod()
                                        .AllowCredentials();
                                }
                            );
                        }
                    );


                builder.Services
                    .AddScoped<PedidoService>();

                builder.Services
                    .AddScoped<AuthService>();

                builder.Services
                    .AddScoped<ConfiguracaoLojaService>();

                builder.Services
                    .AddScoped<StatusLojaService>();

                builder.Services
                    .AddScoped<CupomService>();

                builder.Services
                    .AddScoped<BairroService>();


                // ===== PAGAMENTO PIX =====
                // "Pix:Provedor" no appsettings escolhe a empresa.
                // Hoje: "Simulador" (testes). Depois: "PagBank".
                builder.Services
                    .Configure<PixOpcoes>(
                        builder.Configuration
                            .GetSection("Pix")
                    );

                var provedorPix =
                    builder.Configuration["Pix:Provedor"]
                    ?? "Simulador";

                switch (provedorPix)
                {
                    case "Simulador":
                        builder.Services
                            .AddSingleton<IProvedorPix, SimuladorPixProvedor>();
                        break;

                    // Token em "PagBank:Token" (appsettings.Development.json)
                    case "PagBank":
                        builder.Services
                            .Configure<PagBankOpcoes>(
                                builder.Configuration
                                    .GetSection("PagBank")
                            );

                        builder.Services
                            .AddHttpClient<IProvedorPix, PagBankPixProvedor>();
                        break;

                    default:
                        throw new InvalidOperationException(
                            $"Provedor PIX '{provedorPix}' não existe. " +
                            "Use \"Simulador\" ou \"PagBank\" em Pix:Provedor."
                        );
                }

                // ===== WHATSAPP PARA O CLIENTE =====
                // "WhatsApp:Modo" no appsettings:
                // "Manual" = o admin abre o WhatsApp e envia.
                // "MetaCloudApi" = API oficial, envia sozinho.
                builder.Services
                    .Configure<WhatsappOpcoes>(
                        builder.Configuration
                            .GetSection("WhatsApp")
                    );

                var modoWhatsapp =
                    builder.Configuration["WhatsApp:Modo"]
                    ?? "Manual";

                switch (modoWhatsapp)
                {
                    case "Manual":
                        builder.Services
                            .AddSingleton<IEnvioWhatsapp, EnvioWhatsappManual>();
                        break;

                    // Token e IdNumeroTelefone em "WhatsApp" (appsettings.Development.json)
                    case "MetaCloudApi":
                        builder.Services
                            .AddHttpClient<IEnvioWhatsapp, EnvioWhatsappMetaCloudApi>();
                        break;

                    default:
                        throw new InvalidOperationException(
                            $"Modo de WhatsApp '{modoWhatsapp}' não existe. " +
                            "Use \"Manual\" ou \"MetaCloudApi\" em WhatsApp:Modo."
                        );
                }

                builder.Services
                    .AddScoped<WhatsappService>();

                builder.Services
                    .AddScoped<PixService>();

                // Confirma PIX pagos e expira os vencidos (a cada 20 s)
                builder.Services
                    .AddHostedService<VerificacaoPixBackgroundService>();


                builder.Services
                    .AddDbContext<TimDoLeleDbContext>(
                        options =>
                        {
                            options.UseSqlServer(
                                builder.Configuration
                                    .GetConnectionString(
                                        "DefaultConnection"
                                    )
                            );
                        }
                    );


                builder.Services
                    .AddAuthentication(
                        options =>
                        {
                            options.DefaultAuthenticateScheme =
                                JwtBearerDefaults
                                    .AuthenticationScheme;

                            options.DefaultChallengeScheme =
                                JwtBearerDefaults
                                    .AuthenticationScheme;
                        }
                    )
                    .AddJwtBearer(
                        options =>
                        {
                            options.RequireHttpsMetadata =
                                false;

                            options.SaveToken =
                                true;

                            options.TokenValidationParameters =
                                new TokenValidationParameters
                                {
                                    ValidateIssuer =
                                        true,

                                    ValidateAudience =
                                        true,

                                    ValidateIssuerSigningKey =
                                        true,

                                    ValidateLifetime =
                                        true,

                                    ClockSkew =
                                        TimeSpan.Zero,

                                    ValidIssuer =
                                        builder
                                            .Configuration[
                                                "Jwt:Issuer"
                                            ],

                                    ValidAudience =
                                        builder
                                            .Configuration[
                                                "Jwt:Audience"
                                            ],

                                    IssuerSigningKey =
                                        new SymmetricSecurityKey(
                                            key
                                        )
                                };
                        }
                    );


                builder.Services
                    .AddAuthorization();


                var app =
                    builder.Build();


                app.UseMiddleware<
                    ErrorHandlingMiddleware
                >();


                if (
                    app.Environment
                        .IsDevelopment()
                )
                {
                    app.UseSwagger();

                    app.UseSwaggerUI(
                        options =>
                        {
                            options.SwaggerEndpoint(
                                "/swagger/v1/swagger.json",
                                "TimDoLele API v1"
                            );

                            options.RoutePrefix =
                                string.Empty;
                        }
                    );
                }


                app.UseCors(
                    "AllowAngular"
                );


                app.UseHttpsRedirection();


                // Serve os arquivos da pasta wwwroot
                // (ex.: fotos em /uploads/produtos)
                app.UseStaticFiles();


                app.UseAuthentication();

                app.UseAuthorization();


                app.MapControllers();


                app.MapHub<NotificacaoHub>(
                    "/hubs/notificacoes"
                );


                app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(
                    ex,
                    "Erro fatal ao iniciar a aplicação"
                );
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }
    }
}