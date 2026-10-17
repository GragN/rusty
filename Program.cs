using Grenade.Domain;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ReactionEngine>();

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/catalog", (ReactionEngine engine) => Results.Ok(new
{
    substances = engine.Substances,
    reactions = engine.Reactions,
    statistics = new
    {
        elements = engine.Substances.Count(s => s.Column == "elements"),
        compounds = engine.Substances.Count(s => s.Column == "discoveries"),
        products = engine.Reactions.SelectMany(r => r.Products).Distinct().Count(),
        reactions = engine.Reactions.Count,
        curated = engine.Reactions.Count(r => r.Model == "curated"),
        templates = engine.Reactions.Count(r => r.Model == "template")
    }
}));

app.MapPost("/api/react", (MixRequest request, ReactionEngine engine) =>
{
    if (string.IsNullOrWhiteSpace(request.FirstId) || string.IsNullOrWhiteSpace(request.SecondId)
        || !engine.Contains(request.FirstId) || !engine.Contains(request.SecondId))
    {
        return Results.BadRequest(new { error = "Выберите два вещества из каталога." });
    }

    var variants = engine.FindAll(request.FirstId, request.SecondId);
    var reaction = string.IsNullOrWhiteSpace(request.VariantId)
        ? variants.FirstOrDefault() : variants.FirstOrDefault(r => r.Id == request.VariantId);
    if (!string.IsNullOrWhiteSpace(request.VariantId) && reaction is null)
        return Results.BadRequest(new { error = "Выбранный вариант не относится к этой паре веществ." });
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

internal sealed record MixRequest(string? FirstId, string? SecondId, string? VariantId = null);
