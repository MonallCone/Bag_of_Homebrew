using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Model;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
    options.CallbackPath = "/signin-google";
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

app.UseCors("ReactApp");
app.UseAuthentication();
app.UseAuthorization();

// Kicks off the Google login flow. Hit this via a full page navigation (not fetch).
app.MapGet("/api/auth/login", () => Results.Challenge(
    new AuthenticationProperties { RedirectUri = "http://localhost:5173" },
    new[] { GoogleDefaults.AuthenticationScheme }));

app.MapPost("/api/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok();
});

app.MapGet("/api/auth/me", async (HttpContext ctx, AppDbContext db) =>
{
    if (ctx.User.Identity?.IsAuthenticated != true)
        return Results.Unauthorized();

    var googleId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
    var email = ctx.User.FindFirst(ClaimTypes.Email)?.Value!;
    var name = ctx.User.FindFirst(ClaimTypes.Name)?.Value!;

    var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
    if (user is null)
    {
        user = new User { GoogleId = googleId, Email = email, DisplayName = name };
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    return Results.Ok(new { user.Id, user.Email, user.DisplayName });
});

app.Run();