using System.Security.Cryptography;
using System.Text;

namespace Grenade.Domain;

internal sealed record CatalogData(Substance[] Substances, Reaction[] Reactions);

/// <summary>
/// Educational reaction families. Charge and atom balance are enforced; these
/// templates are not a registry of experimentally identified compounds.
/// </summary>
internal static class ExpandedChemistry
{
    private const int ChainLength = 30;
    private static readonly string[] Stems = ["", "мет", "эт", "проп", "бут", "пент", "гекс", "гепт", "окт", "нон", "дек", "ундек", "додек", "тридек", "тетрадек", "пентадек", "гексадек", "гептадек", "октадек", "нонадек", "эйкоз", "генэйкоз", "докоз", "трикоз", "тетракоз", "пентакоз", "гексакоз", "гептакоз", "октакоз", "нонакоз", "триаконт"];
    private static readonly string[] AcidAliases = ["", "Муравьиная кислота", "Уксусная кислота", "Пропионовая кислота", "Масляная кислота", "Валериановая кислота", "Капроновая кислота", "Энантовая кислота", "Каприловая кислота", "Пеларгоновая кислота", "Каприновая кислота", "Ундекановая кислота", "Лауриновая кислота", "Тридекановая кислота", "Миристиновая кислота", "Пентадекановая кислота", "Пальмитиновая кислота", "Маргариновая кислота", "Стеариновая кислота", "Нонадекановая кислота", "Арахиновая кислота", "Генэйкозановая кислота", "Бегеновая кислота", "Трикозановая кислота", "Лигноцериновая кислота", "Пентакозановая кислота", "Церотиновая кислота", "Гептакозановая кислота", "Монтановая кислота", "Нонакозановая кислота", "Мелиссиновая кислота"];

    private sealed record Metal(string Symbol, string Name, int Charge, bool Active = false, bool Hydrates = false);
    private sealed record Acid(string Formula, string Anion, string Name, int Charge, string Family, int Carbon = 0);
    private sealed record Salt(Metal Metal, Acid Acid, string Id, bool Soluble);
    private sealed record Series(string[] Alcohols, string[] Acids, string[] Alkenes, string[] Aldehydes, string[] Alkanes, string[] Dibromides);

    private static readonly Metal[] Metals =
    [
        new("Li", "лития", 1, true, true), new("Na", "натрия", 1, true, true),
        new("K", "калия", 1, true, true), new("Rb", "рубидия", 1, true, true), new("Cs", "цезия", 1, true, true),
        new("Be", "бериллия", 2), new("Mg", "магния", 2, true, true), new("Ca", "кальция", 2, true, true),
        new("Sr", "стронция", 2, true, true), new("Ba", "бария", 2, true, true),
        new("Zn", "цинка", 2, true), new("Cd", "кадмия", 2, true), new("Mn", "марганца(II)", 2, true),
        new("Fe", "железа(II)", 2, true), new("Fe", "железа(III)", 3), new("Co", "кобальта(II)", 2, true),
        new("Ni", "никеля(II)", 2, true), new("Cu", "меди(II)", 2), new("Al", "алюминия", 3),
        new("Cr", "хрома(III)", 3), new("Pb", "свинца(II)", 2), new("Bi", "висмута(III)", 3),
        new("Ga", "галлия", 3), new("In", "индия", 3), new("Ag", "серебра", 1), new("NH4", "аммония", 1)
    ];

    public static CatalogData Build()
    {
        var builder = new Builder();
        Core(builder);
        var series = Organic(builder);
        var acids = Acids(builder, series);
        var salts = Inorganic(builder, acids);
        Esters(builder, series, salts);
        SpecialOrganics(builder, series);
        return builder.Finish();
    }

    private static void Core(Builder b)
    {
        b.C("CO", "Угарный газ", "gas", "Оксиды углерода");
        b.C("NO", "Оксид азота(II)", "oxide", "Оксиды азота");
        b.C("NO2", "Оксид азота(IV)", "oxide", "Оксиды азота");
        b.C("N2O3", "Оксид азота(III)", "oxide", "Оксиды азота");
        b.C("HNO3", "Азотная кислота", "acid", "Неорганические кислоты");
        b.C("HNO2", "Азотистая кислота", "acid", "Неорганические кислоты, водный раствор");
        b.C("H2CO3", "Угольная кислота", "acid", "Неорганические кислоты, водный раствор");
        b.C("H2SO3", "Сернистая кислота", "acid", "Неорганические кислоты, водный раствор");
        b.C("HF", "Фтороводородная кислота", "acid", "Галогеноводороды");
        b.C("HBr", "Бромоводородная кислота", "acid", "Галогеноводороды");
        b.C("HI", "Иодоводородная кислота", "acid", "Галогеноводороды");
        b.C("Ag2O", "Оксид серебра(I)", "oxide", "Основные оксиды");
        b.C("AgNO3", "Нитрат серебра", "salt", "Нитраты");
        b.C("BaO2", "Пероксид бария", "oxide", "Пероксиды");
        b.C("H2O2", "Пероксид водорода", "liquid", "Пероксиды");
        b.C("CaC2", "Карбид кальция", "salt", "Карбиды");
        b.C("C2H2", "Ацетилен (этин)", "organic", "Алкины");
        b.R("CO2", "C", ["CO"], "Высокая температура", "Восстановление углекислого газа углеродом.", "curated");
        b.R("N2", "O2", ["NO"], "Высокая температура или электрический разряд", "Азот соединяется с кислородом в выбранных условиях.", "curated");
        b.R("NO", "O2", ["NO2"], "Окисление кислородом", "Оксид азота(II) окисляется до диоксида азота.", "curated");
        b.R("NO2", "H2O", ["HNO3", "NO"], "Вода, без избытка кислорода", "Диспропорционирование диоксида азота в воде.", "curated");
        b.R("NO", "NO2", ["N2O3"], "Охлаждение, равновесная смесь", "Образование оксида азота(III).", "curated");
        b.R("N2O3", "H2O", ["HNO2"], "Холодный водный раствор", "Азотистая кислота рассматривается только в растворе.", "curated");
        b.R("CO2", "H2O", ["H2CO3"], "Водный раствор, равновесие", "Угольная кислота находится в равновесии с растворённым CO2.", "curated");
        b.R("SO2", "H2O", ["H2SO3"], "Водный раствор, условная формула гидратированного SO2", "Учебная запись сернистой кислоты в растворе; отдельное чистое вещество не предполагается.", "curated");
        b.R("H2", "F2", ["HF"], "Соединение галогена с водородом; последующее растворение", "Образование фтороводорода.", "curated");
        b.R("H2", "Br2", ["HBr"], "Нагревание; последующее растворение", "Образование бромоводорода.", "curated");
        b.R("H2", "I2", ["HI"], "Нагревание, обратимое взаимодействие", "Образование иодоводорода.", "curated");
        b.R("Ag", "HNO3", ["AgNO3", "NO", "H2O"], "Разбавленная азотная кислота", "Серебро реагирует с кислотой-окислителем; водород не выделяется.", "curated");
        b.R("CaO", "C", ["CaC2", "CO"], "Высокая температура, электрическая печь", "Получение карбида кальция.", "curated");
        b.R("CaC2", "H2O", ["C2H2", "Ca(OH)2"], "Гидролиз карбида", "Из карбида кальция образуется ацетилен.", "curated");
    }

    private static Series Organic(Builder b)
    {
        var alcohols = new string[ChainLength + 1]; var acids = new string[ChainLength + 1];
        var alkenes = new string[ChainLength + 1]; var aldehydes = new string[ChainLength + 1];
        var alkanes = new string[ChainLength + 1]; var dibromides = new string[ChainLength + 1];
        for (var n = 1; n <= ChainLength; n++)
        {
            alcohols[n] = b.C(Alkyl(n) + "OH", n < 3 ? Stems[n] + "анол" : Stems[n] + "ан-1-ол", "organic", "Первичные спирты");
            acids[n] = b.C((n == 1 ? "H" : Alkyl(n - 1)) + "COOH", AcidAliases[n] + " (" + Stems[n] + "ановая)", "acid", "Карбоновые кислоты");
            aldehydes[n] = b.C((n == 1 ? "H" : Alkyl(n - 1)) + "CHO", n == 1 ? "Формальдегид (метаналь)" : Stems[n] + "аналь", "organic", "Альдегиды");
            alkanes[n] = b.C(n == 1 ? "CH4" : "C" + n + "H" + (2 * n + 2), Stems[n] + "ан", "organic", "Алканы");
            var chloride = b.C(Alkyl(n) + "Cl", "1-хлор" + Stems[n] + "ан", "organic", "Галогеналканы");
            b.R(alcohols[n], "CuO", [aldehydes[n], "Cu", "H2O"], "Нагревание первичного спирта с оксидом меди(II)", "Окисление первичного спирта до альдегида.");
            b.R(aldehydes[n], "Ag2O", [acids[n], "Ag"], "Учебная суммарная схема окисления альдегида, аммиачная среда и последующее подкисление", "Выбрана карбоновая кислота как конечная форма продукта; среда реакции не моделируется.");
            b.R(acids[n], "H2", [alcohols[n], "H2O"], "Каталитическое гидрирование, повышенные температура и давление", "Модель восстановления карбоновой кислоты до первичного спирта.");
            b.R(aldehydes[n], "H2", [alcohols[n]], "Катализатор гидрирования", "Гидрирование альдегида даёт первичный спирт.");
            b.R(alcohols[n], "HCl", [chloride, "H2O"], "Катализатор, замещение OH-группы", "Модель получения первичного хлоралкана из спирта.");
            b.R(chloride, "NaOH", [alcohols[n], "NaCl"], "Водный раствор щёлочи; выбрано нуклеофильное замещение", "Гидролиз первичного хлоралкана.");
            b.R(alkanes[n], "O2", ["CO2", "H2O"], "Полное сгорание, избыток кислорода", "Полное сгорание алкана.");
            b.R(alcohols[n], "O2", ["CO2", "H2O"], "Полное сгорание, избыток кислорода", "Полное сгорание спирта.");
            if (n > 1)
            {
                alkenes[n] = b.C("C" + n + "H" + (2 * n), n == 2 ? "Этилен (этен)" : Stems[n] + "-1-ен", "organic", "Алкены");
                dibromides[n] = b.C(n == 2 ? "CH2BrCH2Br" : Alkyl(n - 2) + "CHBrCH2Br", "1,2-дибром" + Stems[n] + "ан", "organic", "Дигалогеналканы");
                b.R(alcohols[n], "H2SO4", [alkenes[n], "H2O", "H2SO4"], "Нагревание, кислотный катализ; выбрана линейная 1-алкеновая модель", "Дегидратация спирта. Катализатор возвращается; для длинных цепей возможны изомеры и побочные процессы.");
                b.R(alkenes[n], "H2", [alkanes[n]], "Каталитическое гидрирование", "Водород присоединяется по двойной связи.");
                b.R(alkenes[n], "Br2", [dibromides[n]], "Присоединение брома по двойной связи", "Модель получения вицинального дибромида.");
                b.R(alkenes[n], "O2", ["CO2", "H2O"], "Полное сгорание", "Полное сгорание алкена.");
            }
        }
        b.R("CO", "H2", [alcohols[1]], "Катализатор, повышенные температура и давление", "Синтез метанола из оксида углерода и водорода.", "curated");
        b.R("C2H2", "H2", [alkenes[2]], "Селективный катализатор, неполное гидрирование", "Ацетилен гидрируется до этилена.", "curated");
        b.R("C2H2", "H2", [alkanes[2]], "Полное каталитическое гидрирование", "При полном гидрировании ацетилена образуется этан.", "curated");
        for (var n = 1; n < ChainLength; n++)
            b.R(alcohols[n], "CO", [acids[n + 1]], "Каталитическое карбонилирование; выбрана линейная кислота", "Модель гомологизации: углеродная цепь кислоты на один атом длиннее спирта. Реальное распределение продуктов зависит от катализатора.");
        return new(alcohols, acids, alkenes, aldehydes, alkanes, dibromides);
    }

    private static List<Acid> Acids(Builder b, Series series)
    {
        List<Acid> acids =
        [
            new("HCl", "Cl", "Хлорид", 1, "Галогениды"), new("HBr", "Br", "Бромид", 1, "Галогениды"),
            new("HI", "I", "Иодид", 1, "Галогениды"), new("HF", "F", "Фторид", 1, "Галогениды"),
            new("H2SO4", "SO4", "Сульфат", 2, "Сульфаты"), new("HNO3", "NO3", "Нитрат", 1, "Нитраты"),
            new("HNO2", "NO2", "Нитрит", 1, "Нитриты"), new("H2CO3", "CO3", "Карбонат", 2, "Карбонаты"),
            new("H2SO3", "SO3", "Сульфит", 2, "Сульфиты"), new("H3PO4", "PO4", "Фосфат", 3, "Фосфаты"),
            new("H3PO4", "HPO4", "Гидрофосфат", 2, "Кислые соли"), new("H3PO4", "H2PO4", "Дигидрофосфат", 1, "Кислые соли"),
            new("H2SO4", "HSO4", "Гидросульфат", 1, "Кислые соли"), new("H2CO3", "HCO3", "Гидрокарбонат", 1, "Кислые соли"),
            new("H2S", "S", "Сульфид", 2, "Сульфиды")
        ];
        for (var n = 1; n <= ChainLength; n++)
        {
            var formula = b.Get(series.Acids[n]).Formula;
            acids.Add(new(formula, formula[..^1], Stems[n] + "аноат", 1, "Соли карбоновых кислот", n));
        }
        return acids;
    }

    private static List<Salt> Inorganic(Builder b, List<Acid> acids)
    {
        var salts = new List<Salt>();
        foreach (var metal in Metals)
        {
            var ammonium = metal.Symbol == "NH4";
            var oxide = ammonium ? "NH3" : Ionic(metal.Symbol, metal.Charge, "O", 2);
            var hydroxide = ammonium ? "NH3" : metal.Symbol == "Ag" ? oxide : Ionic(metal.Symbol, metal.Charge, "OH", 1);
            if (!ammonium)
            {
                b.C(oxide, "Оксид " + metal.Name, "oxide", "Основные и амфотерные оксиды");
                if (metal.Symbol != "Ag")
                {
                    b.C(hydroxide, "Гидроксид " + metal.Name, "base", "Гидроксиды");
                    b.R(metal.Symbol, "O2", [oxide], "Нагревание, выбранная степень окисления и доступность кислорода", "Стехиометрическая модель образования выбранного оксида. Пассивирование и смесь оксидов не учитываются.");
                }
                if (metal.Hydrates)
                    b.R(oxide, "H2O", [hydroxide], metal.Symbol == "Mg" ? "Медленная гидратация, нагревание" : "Гидратация основного оксида", "Соединение основного оксида с водой.");
            }
            foreach (var acid in acids.Where(a => Allowed(metal, a)))
            {
                var formula = Ionic(metal.Symbol, metal.Charge, acid.Anion, acid.Charge);
                var id = b.C(formula, acid.Name + " " + metal.Name, "salt", acid.Family);
                salts.Add(new(metal, acid, id, Soluble(metal, acid)));
                var condition = acid.Anion is "HPO4" or "H2PO4" or "HSO4" or "HCO3"
                    ? "Частичная нейтрализация, соотношение реагентов указано в уравнении"
                    : acid.Anion == "S" ? "Взаимодействие оксида с H2S; для гидролизующихся сульфидов — безводная среда и специальные условия"
                    : acid.Carbon > 6 ? "Выбранные условия нейтрализации длинноцепочечной кислоты; возможна гетерогенная среда"
                    : "Кислотно-основное взаимодействие; выбранная соль, без побочных окислительно-восстановительных процессов";
                b.R(oxide, acid.Formula, ammonium ? [formula] : [formula, "H2O"], condition, ammonium ? "Соль аммония образуется при взаимодействии аммиака с кислотой." : "Модель нейтрализации кислоты основным или амфотерным оксидом. Для слабых кислот, неустойчивых солей и малорастворимых веществ нужны специальные условия.");
                if (!ammonium && metal.Symbol != "Ag")
                    b.R(hydroxide, acid.Formula, [formula, "H2O"], condition, "Кислотно-основная модель: гидроксид и кислота дают выбранную соль и воду.");
                if (metal.Active && acid.Anion is "Cl" or "Br" or "I" or "SO4")
                    b.R(metal.Symbol, acid.Formula, [formula, "H2"], "Разбавленная неокисляющая кислота, выбранные условия", "Активный металл вытесняет водород из кислоты; защитная плёнка и скорость реакции не моделируются.");
            }
        }

        foreach (var salt in salts)
        {
            var metal = salt.Metal; var acid = salt.Acid;
            if (salt.Soluble && metal.Symbol != "NH4" && !IsAlkali(metal) && metal.Symbol is not ("Ba" or "Sr" or "Ca"))
            {
                var hydroxide = metal.Symbol == "Ag" ? "Ag2O" : Ionic(metal.Symbol, metal.Charge, "OH", 1);
                var sodiumSalt = salts.FirstOrDefault(s => s.Metal.Symbol == "Na" && s.Acid.Anion == acid.Anion);
                if (sodiumSalt is not null)
                    b.R(salt.Id, "NaOH", metal.Symbol == "Ag" ? [hydroxide, sodiumSalt.Id, "H2O"] : [hydroxide, sodiumSalt.Id], "Водные растворы, образование осадка; без избытка щёлочи", "Реакция обмена с образованием малорастворимого гидроксида. Для серебра выделяется оксид, поскольку AgOH неустойчив.");
            }
            if (acid.Anion is "CO3" or "HCO3" or "SO3" or "S")
            {
                var chloride = salts.FirstOrDefault(s => s.Metal == metal && s.Acid.Anion == "Cl");
                if (chloride is not null)
                {
                    var gas = acid.Anion is "CO3" or "HCO3" ? "CO2" : acid.Anion == "SO3" ? "SO2" : "H2S";
                    b.R(salt.Id, "HCl", acid.Anion == "S" ? [chloride.Id, gas] : [chloride.Id, gas, "H2O"], "Водный раствор кислоты, выделение газа", "Реакция идёт с образованием газообразного продукта.");
                }
            }
            if (acid.Carbon > 0 && IsAlkali(metal))
            {
                var chloride = salts.First(s => s.Metal == metal && s.Acid.Anion == "Cl");
                b.R(salt.Id, "HCl", [acid.Formula, chloride.Id], "Подкисление раствора соли; для жирных кислот — выделение отдельной фазы", "Сильная кислота вытесняет более слабую карбоновую кислоту из соли.");
            }
        }
        // Exchange only when an insoluble product supplies the driving force.
        foreach (var first in salts.Where(s => s.Soluble && s.Metal.Symbol is "Ba" or "Ca" or "Ag" or "Pb"))
        foreach (var second in salts.Where(s => s.Soluble && s.Metal.Symbol is "Na" or "K"))
        {
            if (first.Acid.Anion == second.Acid.Anion) continue;
            var precipitate = salts.FirstOrDefault(s => s.Metal == first.Metal && s.Acid.Anion == second.Acid.Anion && !s.Soluble);
            var other = salts.FirstOrDefault(s => s.Metal == second.Metal && s.Acid.Anion == first.Acid.Anion);
            if (precipitate is not null && other is not null)
                b.R(first.Id, second.Id, [precipitate.Id, other.Id], "Водные растворы, образование малорастворимого осадка", "Модель ионного обмена: реакцию поддерживает выделение осадка.");
        }
        b.R("BaO", "O2", ["BaO2"], "Нагревание, поглощение кислорода", "Оксид бария образует пероксид.", "curated");
        b.R("BaO2", "H2SO4", ["BaSO4", "H2O2"], "Разбавленная кислота, охлаждение", "Получение пероксида водорода и осадка сульфата бария.", "curated");
        return salts;
    }

    private static void Esters(Builder b, Series series, List<Salt> salts)
    {
        for (var acid = 1; acid <= ChainLength; acid++)
        for (var alcohol = 1; alcohol <= ChainLength; alcohol++)
        {
            var acidFormula = b.Get(series.Acids[acid]).Formula;
            var formula = acidFormula[..^2] + "O" + Repeat("CH2", alcohol - 1) + "CH3";
            var ester = b.C(formula, Stems[alcohol] + "ил" + Stems[acid] + "аноат", "organic", "Сложные эфиры");
            b.R(series.Acids[acid], series.Alcohols[alcohol], [ester, "H2O"], "Кислотный катализ, нагревание, равновесие этерификации", "Карбоновая кислота и спирт образуют сложный эфир и воду. Для длинных цепей условия и фазовое состояние различаются.");
            b.R(ester, "H2O", [series.Acids[acid], series.Alcohols[alcohol]], "Кислотный катализ, избыток воды, нагревание", "Обратимая модель гидролиза сложного эфира.");
            foreach (var symbol in new[] { "Li", "Na", "K" })
            {
                var salt = salts.First(s => s.Metal.Symbol == symbol && s.Acid.Carbon == acid);
                b.R(ester, Ionic(symbol, 1, "OH", 1), [salt.Id, series.Alcohols[alcohol]], "Щелочной гидролиз, нагревание", "Омыление сложного эфира даёт соль карбоновой кислоты и спирт.");
            }
        }
    }

    private static void SpecialOrganics(Builder b, Series series)
    {
        b.C("C6H6", "Бензол", "organic", "Ароматические углеводороды");
        b.C("C7H8", "Толуол (метилбензол)", "organic", "Ароматические углеводороды");
        b.C("C6H5Cl", "Хлорбензол", "organic", "Ароматические галогенпроизводные");
        b.C("C6H5ONa", "Фенолят натрия", "salt", "Феноляты");
        b.C("C6H5OH", "Фенол", "organic", "Фенолы");
        b.C("C6H5NO2", "Нитробензол", "organic", "Нитросоединения");
        b.C("C6H5NH2", "Анилин", "organic", "Ароматические амины");
        b.C("C6H5COOH", "Бензойная кислота", "acid", "Ароматические карбоновые кислоты");
        b.C("CH3CHOHCH3", "Изопропанол (пропан-2-ол)", "organic", "Вторичные спирты");
        b.C("CH3COCH3", "Ацетон (пропанон)", "organic", "Кетоны");
        b.C("CH2OHCH2OH", "Этиленгликоль (этан-1,2-диол)", "organic", "Многоатомные спирты");
        b.C("CH2CHCH2Cl", "Аллилхлорид", "organic", "Ненасыщенные галогенпроизводные");
        b.C("CH2ClCHClCH2Cl", "1,2,3-трихлорпропан", "organic", "Полигалогеналканы");
        b.C("CH2OHCHOHCH2OH", "Глицерин (пропан-1,2,3-триол)", "organic", "Многоатомные спирты");
        b.C("C6H12O6", "Глюкоза", "organic", "Моносахариды");
        b.C("C12H22O11", "Мальтоза", "organic", "Дисахариды");
        b.C("CH3COONa", "Ацетат натрия (этаноат натрия)", "salt", "Соли карбоновых кислот");
        b.R(series.Alkanes[6], "Pt", ["C6H6", "H2", "Pt"], "Каталитическая дегидроциклизация, нагревание", "Учебная суммарная схема ароматизации гексана; катализатор возвращается.");
        b.R(series.Alkanes[7], "Pt", ["C7H8", "H2", "Pt"], "Каталитическая дегидроциклизация, нагревание", "Выбрана ароматизация до толуола.");
        b.R("C6H6", "Cl2", ["C6H5Cl", "HCl"], "Катализатор FeCl3, замещение в ароматическом ядре", "Хлорирование бензола по механизму замещения.", "curated");
        b.R("C6H5Cl", "NaOH", ["C6H5ONa", "NaCl", "H2O"], "Нагревание под давлением, щелочной гидролиз", "Модель процесса получения фенолята натрия.", "curated");
        b.R("C6H5ONa", "HCl", ["C6H5OH", "NaCl"], "Подкисление раствора фенолята", "Выделение фенола из его соли.", "curated");
        b.R("C6H6", "HNO3", ["C6H5NO2", "H2O"], "Кислотный катализ, нитрование", "Суммарная схема образования нитробензола.", "curated");
        b.R("C6H5NO2", "H2", ["C6H5NH2", "H2O"], "Каталитическое восстановление", "Восстановление нитрогруппы до аминогруппы.", "curated");
        b.R("C7H8", "O2", ["C6H5COOH", "H2O"], "Каталитическое окисление боковой цепи", "Выбран продукт окисления метильной группы — бензойная кислота.");
        b.R(series.Alkenes[3], "H2O", ["CH3CHOHCH3"], "Кислотный катализ, гидратация по правилу Марковникова", "Из пропена образуется изопропанол.", "curated");
        b.R("CH3CHOHCH3", "CuO", ["CH3COCH3", "Cu", "H2O"], "Нагревание", "Вторичный спирт окисляется до кетона.", "curated");
        b.R(series.Dibromides[2], "NaOH", ["CH2OHCH2OH", "NaBr"], "Водная щёлочь, двойное замещение", "Из вицинального дигалогеналкана получается этиленгликоль.", "curated");
        b.R(series.Alkenes[3], "Cl2", ["CH2CHCH2Cl", "HCl"], "Высокая температура, выбрано аллильное замещение", "Выбрано замещение в аллильном положении, а не присоединение.");
        b.R("CH2CHCH2Cl", "Cl2", ["CH2ClCHClCH2Cl"], "Присоединение по двойной связи", "Получение трихлорпропана.", "curated");
        b.R("CH2ClCHClCH2Cl", "NaOH", ["CH2OHCHOHCH2OH", "NaCl"], "Водная щёлочь, замещение трёх атомов хлора", "Модель получения глицерина из тригалогенпроизводного.");
        b.R("CO2", "H2O", ["C6H12O6", "O2"], "Свет, фотосинтез в живых клетках; суммарный процесс", "Это биологическая суммарная схема, а не реакция в обычном стакане.", "curated");
        b.R("C6H12O6", "H2O", [series.Alcohols[2], "CO2", "H2O"], "Ферменты дрожжей, спиртовое брожение; вода — среда", "Суммарная схема спиртового брожения; среда возвращается.", "curated");
        b.R("C6H12O6", "C6H12O6", ["C12H22O11", "H2O"], "Ферментативный синтез, выбрана мальтоза", "Две молекулы глюкозы образуют дисахарид в выбранной ферментативной модели.");
        b.R("C12H22O11", "H2O", ["C6H12O6"], "Кислотный или ферментативный гидролиз", "Гидролиз мальтозы даёт глюкозу.", "curated");
    }

    private static bool Allowed(Metal m, Acid a)
    {
        if (a.Anion == "I" && (m is { Symbol: "Fe", Charge: 3 } || m.Symbol is "Cu" or "Bi")) return false;
        if (a.Anion == "NO3" && m is { Symbol: "Fe", Charge: 2 }) return false;
        if (a.Anion == "CO3" && (m.Charge > 2 || m.Symbol is "Be" or "Cu")) return false;
        if (a.Anion is "NO2" or "SO3" or "HPO4" or "H2PO4" or "HCO3" or "HSO4")
            return IsAlkali(m) || m.Symbol is "NH4" or "Mg" or "Ca" or "Sr" or "Ba";
        if (a.Anion == "S" && (m.Symbol == "NH4" || m is { Symbol: "Fe", Charge: 3 })) return false;
        return true;
    }

    private static bool Soluble(Metal m, Acid a)
    {
        if (a.Carbon > 4) return false;
        if (a.Anion == "NO3") return true;
        if (a.Anion == "F") return IsAlkali(m) && m.Symbol != "Li" || m.Symbol == "NH4";
        if (a.Anion is "Cl" or "Br" or "I") return m.Symbol is not ("Ag" or "Pb" or "Bi");
        if (a.Anion == "SO4") return m.Symbol is not ("Ba" or "Sr" or "Ca" or "Pb" or "Ag");
        if (a.Anion is "S" or "CO3" or "SO3" or "PO4" or "HPO4") return IsAlkali(m) && !(m.Symbol == "Li" && a.Anion == "CO3") || m.Symbol == "NH4";
        if (a.Carbon > 0) return m.Symbol is not ("Ag" or "Bi");
        return IsAlkali(m) || m.Symbol == "NH4";
    }

    private static bool IsAlkali(Metal m) => m.Symbol is "Li" or "Na" or "K" or "Rb" or "Cs";
    private static string Alkyl(int n) => "CH3" + Repeat("CH2", n - 1);
    private static string Repeat(string group, int n) => n == 0 ? "" : n == 1 ? group : "(" + group + ")" + n;
    private static int Gcd(int a, int b) => b == 0 ? a : Gcd(b, a % b);
    private static string Ionic(string cation, int positive, string anion, int negative)
    {
        var gcd = Gcd(positive, negative);
        string Part(string ion, int count) => count == 1 ? ion : (ChemicalFormula.Parse(ion).Values.Sum() > 1 ? "(" + ion + ")" : ion) + count;
        return Part(cation, negative / gcd) + Part(anion, positive / gcd);
    }

    private sealed class Builder
    {
        private readonly Dictionary<string, Substance> substances = ChemistryCatalog.Substances.ToDictionary(s => s.Id);
        private readonly Dictionary<string, string> formulas = ChemistryCatalog.Substances.ToDictionary(s => s.Formula, s => s.Id);
        private readonly List<Reaction> reactions = [.. ChemistryCatalog.Reactions];
        private readonly HashSet<string> equations = ChemistryCatalog.Reactions.Select(r => Identity(r.Reactants, r.Products)).ToHashSet();
        private readonly Dictionary<string, string> salts = ChemistryCatalog.Substances.Where(s => s.Category == "salt")
            .ToDictionary(s => ChemicalFormula.Molecular(s.Formula), s => s.Id);

        public string C(string formula, string name, string category, string family)
        {
            if (formulas.TryGetValue(formula, out var existing))
            {
                if (substances[existing].Family is null) substances[existing] = substances[existing] with { Family = family };
                return existing;
            }
            var molecular = ChemicalFormula.Molecular(formula);
            if (category == "salt" && salts.TryGetValue(molecular, out var alias))
            {
                formulas.Add(formula, alias);
                substances[alias] = substances[alias] with { Name = substances[alias].Name + " / " + name };
                return alias;
            }
            var id = "compound:" + formula.ToLowerInvariant();
            if (substances.ContainsKey(id)) throw new InvalidOperationException("Повтор ID: " + formula);
            substances.Add(id, new(id, formula, char.ToUpperInvariant(name[0]) + name[1..], category, "discoveries", Family: family));
            formulas.Add(formula, id);
            if (category == "salt") salts.Add(molecular, id);
            return id;
        }

        public Substance Get(string idOrFormula) => substances.GetValueOrDefault(idOrFormula) ?? substances[formulas[idOrFormula]];

        public void R(string first, string second, string[] products, string condition, string description, string model = "template")
        {
            var inputs = new[] { Get(first), Get(second) };
            var outputs = products.Select(Get).ToArray();
            if (!equations.Add(Identity(inputs.Select(s => s.Id), outputs.Select(s => s.Id)))) return;
            var equation = ChemicalFormula.Balance(inputs.Select(s => s.Formula).ToArray(), outputs.Select(s => s.Formula).ToArray());
            reactions.Add(new(inputs.Select(s => s.Id).ToArray(), outputs.Select(s => s.Id).ToArray(), equation, condition, description, model,
                outputs.Select(s => s.Family).FirstOrDefault(f => f is not null)));
        }

        private static string Identity(IEnumerable<string> inputs, IEnumerable<string> outputs)
            => string.Join("|", inputs.Order()) + "=>" + string.Join("|", outputs.Order());

        public CatalogData Finish()
        {
            var finalized = reactions.Select(r => r with { Id = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(r.Equation + "|" + r.Condition)))[..16].ToLowerInvariant() }).ToArray();
            return new(substances.Values.Select(s => s with { MolecularFormula = ChemicalFormula.Molecular(s.Formula) }).ToArray(), finalized);
        }
    }
}
