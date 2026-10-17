using System.Text.RegularExpressions;
using Grenade.Domain;

var engine = new ReactionEngine();
var checks = 0;
var failures = new List<string>();

void Check(bool condition, string description)
{
    checks++;
    if (!condition) failures.Add(description);
}

var elements = engine.Substances.Where(s => s.Column == "elements").ToArray();
Check(elements.Length == 118, "В первом столбце все 118 элементов");
Check(elements.Select(s => s.AtomicNumber ?? 0).SequenceEqual(Enumerable.Range(1, 118)), "Атомные номера от 1 до 118 без пропусков, в порядке возрастания");
Check(elements.Select(s => s.Symbol).Distinct().Count() == 118, "Символы элементов не повторяются");
Check(elements.Single(s => s.AtomicNumber == 1).Symbol == "H" && elements.Single(s => s.AtomicNumber == 118).Symbol == "Og", "От водорода до оганесона");
Check(elements.Single(s => s.AtomicNumber == 26).Id == "fe" && elements.Single(s => s.AtomicNumber == 79).Symbol == "Au", "Железо и золото имеют правильные номера");
Check(engine.Substances.All(s => s.Column is "elements" or "discoveries"), "В каталоге ровно две группы");
Check(new[] { "h2o", "hcl", "h2so4", "naoh", "co2", "cuso4", "nacl" }.All(id => engine.Get(id).Column == "discoveries"), "Сложные вещества находятся только среди продуктов реакций");
foreach (var element in elements)
{
    var position = 0;
    var atoms = ParseGroup(element.Formula, ref position);
    Check(position == element.Formula.Length && atoms.Count == 1 && atoms.ContainsKey(element.Symbol!), $"Первый столбец содержит простое вещество: {element.Name}");
}

Check(engine.Find("fe", "o2")?.Products.SequenceEqual(["fe2o3"]) == true, "Железо + кислород → оксид железа(III)");
Check(engine.Find("fe2o3", "fe")?.Products.SequenceEqual(["feo"]) == true, "Повторное использование открытия: Fe2O3 + Fe → FeO");
Check(engine.Find("cao", "h2o")?.Products.SequenceEqual(["caoh2"]) == true, "Два вещества из столбца продуктов");
Check(engine.Find("fe2o3", "al")?.Products.Contains("fe") == true, "Второй столбец + первый столбец");
Check(engine.Find("caoh2", "hcl")?.Products.Contains("cacl2") == true, "Повторная цепочка реакций");
Check(engine.Find("fe", "s")?.Products.Contains("fes") == true, "Смешивание внутри первого столбца");
Check(engine.Find("h2", "o2")?.Products.Contains("h2o") == true, "Водород и кислород из первого столбца");
Check(engine.Find("cao", "sio2")?.Products.SequenceEqual(["casio3"]) == true, "Смешивание двух открытий внутри второго столбца");
Check(engine.Find("so2", "o2")?.Products.SequenceEqual(["so3"]) == true && engine.Find("so3", "h2o")?.Products.SequenceEqual(["h2so4"]) == true, "Серную кислоту можно получить цепочкой из простых веществ");
Check(engine.Find("fe", "cu") is null, "Неизвестная пара не создаёт вымышленный продукт");
Check(engine.Find("fe", "fe") is null, "Смешивание одинаковых веществ не создаёт продукт");
Check(engine.Find("missing", "o2") is null && !engine.Contains("missing"), "Неизвестный ID обрабатывается корректно");

foreach (var reaction in engine.Reactions)
{
    var label = reaction.Equation;
    Check(ReferenceEquals(reaction, engine.Find(reaction.Reactants[0], reaction.Reactants[1])), $"Прямой поиск: {label}");
    Check(ReferenceEquals(reaction, engine.Find(reaction.Reactants[1], reaction.Reactants[0])), $"Порядок не важен: {label}");
    Check(reaction.Reactants.Concat(reaction.Products).All(engine.Contains), $"Все вещества существуют: {label}");
    Check(!string.IsNullOrWhiteSpace(reaction.Condition) && !string.IsNullOrWhiteSpace(reaction.Description), $"Указаны условия и описание: {label}");
    var sides = Regex.Split(label, "[→⇌]");
    var left = ParseSide(sides[0]);
    var right = ParseSide(sides[1]);
    Check(left.Count == right.Count && left.All(item => right.GetValueOrDefault(item.Key) == item.Value), $"Сохранение числа атомов: {label}");
    Check(Formulas(sides[0]).Order().SequenceEqual(reaction.Reactants.Select(id => engine.Get(id).Formula).Order()), $"Реагенты соответствуют уравнению: {label}");
    Check(Formulas(sides[1]).Order().SequenceEqual(reaction.Products.Select(id => engine.Get(id).Formula).Order()), $"Продукты соответствуют уравнению: {label}");
}

var reachable = elements.Select(s => s.Id).ToHashSet();
bool changed;
do
{
    changed = false;
    foreach (var reaction in engine.Reactions.Where(r => r.Reactants.All(reachable.Contains)))
        foreach (var product in reaction.Products) changed |= reachable.Add(product);
} while (changed);
foreach (var substance in engine.Substances)
    Check(reachable.Contains(substance.Id), $"Вещество достижимо из исходного каталога: {substance.Name}");

if (failures.Count > 0)
{
    foreach (var failure in failures) Console.Error.WriteLine($"FAIL: {failure}");
    Console.Error.WriteLine($"{failures.Count} failed out of {checks} checks.");
    return 1;
}
Console.WriteLine($"PASS: {checks} checks; {engine.Substances.Count} substances; {engine.Reactions.Count} reactions. All equations balanced; every substance reachable.");
return 0;

static string[] Formulas(string side) => side.Split('+').Select(term => Regex.Replace(term.Trim(), @"^\d+", "")).ToArray();

static Dictionary<string, int> ParseSide(string side)
{
    var result = new Dictionary<string, int>();
    foreach (var term in side.Split('+'))
    {
        var match = Regex.Match(term.Trim(), @"^(\d+)?(.*)$");
        var coefficient = match.Groups[1].Success ? int.Parse(match.Groups[1].Value) : 1;
        var formula = match.Groups[2].Value;
        var index = 0;
        foreach (var (element, count) in ParseGroup(formula, ref index))
            result[element] = result.GetValueOrDefault(element) + count * coefficient;
    }
    return result;
}

static Dictionary<string, int> ParseGroup(string formula, ref int index)
{
    var result = new Dictionary<string, int>();
    while (index < formula.Length && formula[index] != ')')
    {
        Dictionary<string, int> group;
        if (formula[index] == '(')
        {
            index++;
            group = ParseGroup(formula, ref index);
            if (index >= formula.Length || formula[index] != ')') throw new FormatException(formula);
            index++;
        }
        else
        {
            if (!char.IsUpper(formula[index])) throw new FormatException(formula);
            var start = index++;
            while (index < formula.Length && char.IsLower(formula[index])) index++;
            group = new() { [formula[start..index]] = 1 };
        }
        var numberStart = index;
        while (index < formula.Length && char.IsDigit(formula[index])) index++;
        var multiplier = index > numberStart ? int.Parse(formula[numberStart..index]) : 1;
        foreach (var (element, count) in group)
            result[element] = result.GetValueOrDefault(element) + count * multiplier;
    }
    return result;
}
