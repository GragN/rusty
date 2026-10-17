namespace Grenade.Domain;

public sealed record Substance(string Id, string Formula, string Name, string Category, string Column,
    int? AtomicNumber = null, string? Symbol = null, string? Family = null, string? MolecularFormula = null);

public sealed record Reaction(string[] Reactants, string[] Products, string Equation, string Condition, string Description,
    string Model = "curated", string? Family = null, string Id = "");

public sealed class ReactionEngine
{
    public IReadOnlyList<Substance> Substances { get; }
    public IReadOnlyList<Reaction> Reactions { get; }
    private readonly Dictionary<string, Substance> substances;
    private readonly Dictionary<string, Reaction[]> reactions;

    public ReactionEngine()
    {
        var catalog = ExpandedChemistry.Build();
        Substances = catalog.Substances;
        Reactions = catalog.Reactions;
        substances = Substances.ToDictionary(s => s.Id, StringComparer.Ordinal);
        reactions = Reactions.GroupBy(r => Key(r.Reactants[0], r.Reactants[1]))
            .ToDictionary(group => group.Key, group => group.ToArray(), StringComparer.Ordinal);
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
    public IReadOnlyList<Reaction> FindAll(string first, string second) => reactions.GetValueOrDefault(Key(first, second)) ?? [];
    public Reaction? Find(string first, string second) => FindAll(first, second).FirstOrDefault();
    private static string Key(string first, string second) => string.CompareOrdinal(first, second) <= 0
        ? $"{first}|{second}" : $"{second}|{first}";
}
