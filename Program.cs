using Grenade.Domain;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ReactionEngine>();

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/catalog", (ReactionEngine engine) => Results.Ok(new
{
    substances = engine.Substances,
    reactions = engine.Reactions
}));

app.MapPost("/api/react", (MixRequest request, ReactionEngine engine) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstId) || string.IsNullOrWhiteSpace(request.SecondId)
        || !engine.Contains(request.FirstId) || !engine.Contains(request.SecondId))
    {
        return Results.BadRequest(new { error = "Выберите два вещества из каталога." });
    }

    var reaction = engine.Find(request.FirstId, request.SecondId);
    return reaction is null
        ? Results.Ok(new { matched = false, message = "Для этой пары в справочнике нет реакции. Попробуйте другое сочетание." })
        : Results.Ok(new
        {
            matched = true,
            reaction,
            products = reaction.Products.Select(engine.Get).ToArray()
        });
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.Run();

internal sealed record MixRequest(string? FirstId, string? SecondId);
