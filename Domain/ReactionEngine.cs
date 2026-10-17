namespace Grenade.Domain;

public sealed record Substance(string Id, string Formula, string Name, string Category, string Column);

public sealed record Reaction(string[] Reactants, string[] Products, string Equation, string Condition, string Description);

public sealed class ReactionEngine
{
    public IReadOnlyList<Substance> Substances { get; } = ChemistryCatalog.Substances;
    public IReadOnlyList<Reaction> Reactions { get; } = ChemistryCatalog.Reactions;
    private readonly Dictionary<string, Substance> substances;
    private readonly Dictionary<string, Reaction> reactions;

    public ReactionEngine()
    {
        substances = Substances.ToDictionary(s => s.Id, StringComparer.Ordinal);
        reactions = Reactions.ToDictionary(r => Key(r.Reactants[0], r.Reactants[1]), StringComparer.Ordinal);
        foreach (var reaction in Reactions)
        {
            if (reaction.Reactants.Length != 2 || reaction.Products.Length == 0
                || reaction.Reactants.Concat(reaction.Products).Any(id => !substances.ContainsKey(id)))
            {
                throw new InvalidOperationException($"Некорректная реакция: {reaction.Equation}");
            }
        }
    }

    public bool Contains(string id) => substances.ContainsKey(id);
    public Substance Get(string id) => substances[id];
    public Reaction? Find(string first, string second) => reactions.GetValueOrDefault(Key(first, second));
    private static string Key(string first, string second) => string.CompareOrdinal(first, second) <= 0
        ? $"{first}|{second}" : $"{second}|{first}";
}
