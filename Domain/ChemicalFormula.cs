using System.Numerics;
using System.Text.RegularExpressions;

namespace Grenade.Domain;

/// <summary>Parses condensed formulas and balances equations with exact rational arithmetic.</summary>
public static partial class ChemicalFormula
{
    public static Dictionary<string, int> Parse(string formula)
    {
        var index = 0;
        var result = Group(formula, ref index);
        if (index != formula.Length || result.Count == 0) throw new FormatException($"Некорректная формула: {formula}");
        return result;
    }

    public static string Molecular(string formula)
    {
        var atoms = Parse(formula);
        var order = atoms.ContainsKey("C")
            ? atoms.Keys.OrderBy(e => e == "C" ? 0 : e == "H" ? 1 : 2).ThenBy(e => e, StringComparer.Ordinal)
            : atoms.Keys.OrderBy(e => e, StringComparer.Ordinal);
        return string.Concat(order.Select(e => e + (atoms[e] == 1 ? "" : atoms[e].ToString())));
    }

    public static string Balance(IReadOnlyList<string> reactants, IReadOnlyList<string> products)
    {
        var formulas = reactants.Concat(products).ToArray();
        var atoms = formulas.Select(Parse).ToArray();
        var elements = atoms.SelectMany(a => a.Keys).Distinct().ToArray();
        var matrix = new Fraction[elements.Length, formulas.Length];
        for (var row = 0; row < elements.Length; row++)
            for (var column = 0; column < formulas.Length; column++)
                matrix[row, column] = new(atoms[column].GetValueOrDefault(elements[row]) * (column < reactants.Count ? 1 : -1));

        var pivots = new List<int>();
        var pivotRow = 0;
        for (var column = 0; column < formulas.Length && pivotRow < elements.Length; column++)
        {
            var found = pivotRow;
            while (found < elements.Length && matrix[found, column].IsZero) found++;
            if (found == elements.Length) continue;
            for (var j = 0; j < formulas.Length; j++)
                (matrix[pivotRow, j], matrix[found, j]) = (matrix[found, j], matrix[pivotRow, j]);
            var divisor = matrix[pivotRow, column];
            for (var j = column; j < formulas.Length; j++) matrix[pivotRow, j] /= divisor;
            for (var row = 0; row < elements.Length; row++)
            {
                if (row == pivotRow) continue;
                var multiplier = matrix[row, column];
                for (var j = column; j < formulas.Length; j++) matrix[row, j] -= multiplier * matrix[pivotRow, j];
            }
            pivots.Add(column);
            pivotRow++;
        }
        var free = Enumerable.Range(0, formulas.Length).Except(pivots).ToArray();
        if (free.Length == 0) throw new InvalidOperationException($"Уравнение не балансируется: {string.Join(" + ", formulas)}");
        var solution = Enumerable.Repeat(new Fraction(0), formulas.Length).ToArray();
        foreach (var column in free) solution[column] = new(1);
        for (var row = pivots.Count - 1; row >= 0; row--)
            solution[pivots[row]] = free.Aggregate(new Fraction(0), (sum, column) => sum - matrix[row, column] * solution[column]);
        var lcm = solution.Aggregate(BigInteger.One, (value, item) => Lcm(value, item.Denominator));
        var coefficients = solution.Select(item => item.Numerator * (lcm / item.Denominator)).ToArray();
        if (coefficients.All(c => c < 0)) coefficients = coefficients.Select(c => -c).ToArray();
        if (coefficients.Any(c => c <= 0)) throw new InvalidOperationException($"Нет положительных коэффициентов: {string.Join(" + ", formulas)}");
        var gcd = coefficients.Aggregate(BigInteger.GreatestCommonDivisor);
        string Term(int index) => (coefficients[index] / gcd == 1 ? "" : (coefficients[index] / gcd).ToString()) + formulas[index];
        return string.Join(" + ", Enumerable.Range(0, reactants.Count).Select(Term)) + " → "
            + string.Join(" + ", Enumerable.Range(reactants.Count, products.Count).Select(Term));
    }

    public static bool IsBalanced(string equation)
    {
        var sides = Arrow().Split(equation);
        if (sides.Length != 2) return false;
        var left = Side(sides[0]);
        var right = Side(sides[1]);
        return left.Count == right.Count && left.All(e => right.GetValueOrDefault(e.Key) == e.Value);
    }

    private static Dictionary<string, int> Side(string side)
    {
        var result = new Dictionary<string, int>();
        foreach (var term in side.Split('+'))
        {
            var match = Coefficient().Match(term.Trim());
            var coefficient = match.Groups[1].Success ? int.Parse(match.Groups[1].Value) : 1;
            foreach (var (element, number) in Parse(match.Groups[2].Value))
                result[element] = result.GetValueOrDefault(element) + coefficient * number;
        }
        return result;
    }

    private static Dictionary<string, int> Group(string formula, ref int index)
    {
        var atoms = new Dictionary<string, int>();
        while (index < formula.Length && formula[index] != ')')
        {
            Dictionary<string, int> group;
            if (formula[index] == '(')
            {
                index++;
                group = Group(formula, ref index);
                if (index >= formula.Length || formula[index++] != ')') throw new FormatException(formula);
            }
            else
            {
                if (!char.IsAsciiLetterUpper(formula[index])) throw new FormatException(formula);
                var start = index++;
                while (index < formula.Length && char.IsAsciiLetterLower(formula[index])) index++;
                group = new() { [formula[start..index]] = 1 };
            }
            var numberStart = index;
            while (index < formula.Length && char.IsAsciiDigit(formula[index])) index++;
            var multiplier = index > numberStart ? int.Parse(formula[numberStart..index]) : 1;
            if (multiplier < 1) throw new FormatException(formula);
            foreach (var (element, number) in group) atoms[element] = atoms.GetValueOrDefault(element) + number * multiplier;
        }
        return atoms;
    }

    private static BigInteger Lcm(BigInteger a, BigInteger b) => a / BigInteger.GreatestCommonDivisor(a, b) * b;
    [GeneratedRegex("[→⇌]")] private static partial Regex Arrow();
    [GeneratedRegex(@"^(\d+)?(.+)$")] private static partial Regex Coefficient();

    private readonly struct Fraction
    {
        public BigInteger Numerator { get; }
        private readonly BigInteger denominator;
        public BigInteger Denominator => denominator.IsZero ? BigInteger.One : denominator;
        public bool IsZero => Numerator.IsZero;
        public Fraction(BigInteger numerator, BigInteger denominator = default)
        {
            if (denominator.IsZero) denominator = 1;
            if (denominator < 0) { numerator = -numerator; denominator = -denominator; }
            var gcd = BigInteger.GreatestCommonDivisor(numerator, denominator);
            Numerator = numerator / gcd; this.denominator = denominator / gcd;
        }
        public static Fraction operator -(Fraction a, Fraction b) => new(a.Numerator * b.Denominator - b.Numerator * a.Denominator, a.Denominator * b.Denominator);
        public static Fraction operator *(Fraction a, Fraction b) => new(a.Numerator * b.Numerator, a.Denominator * b.Denominator);
        public static Fraction operator /(Fraction a, Fraction b) => b.IsZero ? throw new DivideByZeroException() : new(a.Numerator * b.Denominator, a.Denominator * b.Numerator);
    }
}
