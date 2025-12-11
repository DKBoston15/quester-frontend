/**
 * Bidirectional design translation utility
 * Maps standard design names across all supported locales
 */

export type DesignType = 'analytic' | 'measurement' | 'research' | 'sampling';
export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'zh';

type LocaleTranslations = Record<SupportedLocale, string>;
type DesignTranslationMap = Record<string, LocaleTranslations>;

/**
 * Complete bidirectional mapping of all standard design names
 * Key is the translation key, value is the name in each locale
 */
export const designTranslations: Record<DesignType, DesignTranslationMap> = {
  analytic: {
    associative: {
      en: "Associative",
      es: "Asociativo",
      fr: "Associatif",
      de: "Assoziativ",
      zh: "关联的"
    },
    descriptive: {
      en: "Descriptive",
      es: "Descriptivo",
      fr: "Descriptif",
      de: "Deskriptiv",
      zh: "描述性"
    },
    emergent: {
      en: "Emergent",
      es: "Emergente",
      fr: "Émergent",
      de: "Emergent",
      zh: "新兴的"
    },
    narrative: {
      en: "Narrative",
      es: "Narrativo",
      fr: "Narratif",
      de: "Narrativ",
      zh: "叙事性"
    },
    predictive: {
      en: "Predictive",
      es: "Predictivo",
      fr: "Prédictif",
      de: "Prädiktiv",
      zh: "预测性"
    },
    thematic: {
      en: "Thematic",
      es: "Temático",
      fr: "Thématique",
      de: "Thematisch",
      zh: "主题性"
    },
    metaAnalysis: {
      en: "Meta-analysis",
      es: "Metaanálisis",
      fr: "Méta-analyse",
      de: "Meta-Analyse",
      zh: "元分析"
    },
    secondary: {
      en: "Secondary",
      es: "Secundario",
      fr: "Secondaire",
      de: "Sekundär",
      zh: "二次分析"
    }
  },
  measurement: {
    extant: {
      en: "Extant",
      es: "Existente",
      fr: "Existant",
      de: "Bestehend",
      zh: "现存的"
    },
    interview: {
      en: "Interview",
      es: "Entrevista",
      fr: "Entretien",
      de: "Interview",
      zh: "访谈"
    },
    instrument: {
      en: "Instrument",
      es: "Instrumento",
      fr: "Instrument",
      de: "Instrument",
      zh: "量表"
    },
    survey: {
      en: "Survey",
      es: "Encuesta",
      fr: "Enquête",
      de: "Umfrage",
      zh: "问卷调查"
    }
  },
  research: {
    caseStudy: {
      en: "Case study",
      es: "Estudio de caso",
      fr: "Étude de cas",
      de: "Fallstudie",
      zh: "案例研究"
    },
    convergentParallel: {
      en: "Convergent parallel",
      es: "Paralelo convergente",
      fr: "Parallèle convergent",
      de: "Konvergent parallel",
      zh: "汇聚平行设计"
    },
    correlational: {
      en: "Correlational",
      es: "Correlacional",
      fr: "Corrélationnel",
      de: "Korrelativ",
      zh: "相关性研究"
    },
    descriptive: {
      en: "Descriptive",
      es: "Descriptivo",
      fr: "Descriptif",
      de: "Deskriptiv",
      zh: "描述性研究"
    },
    experimental: {
      en: "Experimental",
      es: "Experimental",
      fr: "Expérimental",
      de: "Experimentell",
      zh: "实验性研究"
    },
    explanatorySequential: {
      en: "Explanatory sequential",
      es: "Secuencial explicativo",
      fr: "Séquentiel explicatif",
      de: "Erklärend sequentiell",
      zh: "解释性顺序设计"
    },
    exploratorySequential: {
      en: "Exploratory sequential",
      es: "Secuencial exploratorio",
      fr: "Séquentiel exploratoire",
      de: "Explorativ sequentiell",
      zh: "探索性顺序设计"
    },
    review: {
      en: "Review",
      es: "Revisión",
      fr: "Revue",
      de: "Übersicht",
      zh: "综述"
    },
    survey: {
      en: "Survey",
      es: "Encuesta",
      fr: "Enquête",
      de: "Umfrage",
      zh: "调查研究"
    }
  },
  sampling: {
    cluster: {
      en: "Cluster",
      es: "Por conglomerados",
      fr: "Par grappes",
      de: "Klumpen",
      zh: "整群抽样"
    },
    simpleRandomSampling: {
      en: "Simple Random Sampling (SRS)",
      es: "Muestreo aleatorio simple (MAS)",
      fr: "Échantillonnage aléatoire simple (EAS)",
      de: "Einfache Zufallsstichprobe (EZS)",
      zh: "简单随机抽样"
    },
    stratified: {
      en: "Stratified",
      es: "Estratificado",
      fr: "Stratifié",
      de: "Geschichtet",
      zh: "分层抽样"
    },
    systematic: {
      en: "Systematic",
      es: "Sistemático",
      fr: "Systématique",
      de: "Systematisch",
      zh: "系统抽样"
    },
    convenience: {
      en: "Convenience",
      es: "Por conveniencia",
      fr: "De commodité",
      de: "Gelegenheit",
      zh: "便利抽样"
    },
    purposive: {
      en: "Purposive",
      es: "Intencional",
      fr: "Raisonné",
      de: "Gezielt",
      zh: "目的性抽样"
    },
    quota: {
      en: "Quota",
      es: "Por cuotas",
      fr: "Par quotas",
      de: "Quote",
      zh: "配额抽样"
    },
    snowball: {
      en: "Snowball",
      es: "Bola de nieve",
      fr: "Boule de neige",
      de: "Schneeballverfahren",
      zh: "滚雪球抽样"
    },
    voluntaryResponse: {
      en: "Voluntary response",
      es: "Respuesta voluntaria",
      fr: "Réponse volontaire",
      de: "Freiwillige Antwort",
      zh: "自愿响应"
    }
  }
};

/**
 * Find the translation key for a design name by searching all locales
 * @param type - The design type (analytic, measurement, research, sampling)
 * @param name - The design name in any language
 * @returns The translation key if found, null otherwise
 */
export function findDesignKey(type: DesignType, name: string): string | null {
  const typeTranslations = designTranslations[type];
  if (!typeTranslations) return null;

  const normalizedName = name.toLowerCase().trim();

  for (const [key, locales] of Object.entries(typeTranslations)) {
    for (const localeName of Object.values(locales)) {
      if (localeName.toLowerCase().trim() === normalizedName) {
        return key;
      }
    }
  }

  return null;
}

/**
 * Check if a design name is a standard design (exists in our mapping)
 * @param type - The design type
 * @param name - The design name
 * @returns true if the design is a standard design
 */
export function isStandardDesign(type: DesignType, name: string): boolean {
  return findDesignKey(type, name) !== null;
}

/**
 * Translate a design name from any language to the target locale
 * Returns the original name if it's not a standard design
 * @param type - The design type
 * @param name - The design name in any language
 * @param toLocale - The target locale
 * @returns The translated design name or the original if not found
 */
export function translateDesignName(
  type: DesignType,
  name: string,
  toLocale: SupportedLocale
): string {
  const key = findDesignKey(type, name);
  if (!key) return name;

  const translations = designTranslations[type][key];
  return translations[toLocale] || name;
}

/**
 * Translate all designs in a category
 * Preserves custom designs (not in mapping) unchanged
 * @param type - The design type
 * @param designs - Array of design objects with name property
 * @param toLocale - The target locale
 * @returns New array with translated design names
 */
export function translateDesigns(
  type: DesignType,
  designs: { name: string }[],
  toLocale: SupportedLocale
): { name: string }[] {
  return designs.map(design => ({
    name: translateDesignName(type, design.name, toLocale)
  }));
}

/**
 * Translate all design categories
 * @param allDesigns - Object with design arrays for each type
 * @param toLocale - The target locale
 * @returns New object with all designs translated
 */
export function translateAllDesigns(
  allDesigns: Record<string, { name: string }[]>,
  toLocale: SupportedLocale
): Record<string, { name: string }[]> {
  const result: Record<string, { name: string }[]> = {};

  for (const [type, designs] of Object.entries(allDesigns)) {
    if (isValidDesignType(type)) {
      result[type] = translateDesigns(type, designs, toLocale);
    } else {
      // Preserve unknown design types as-is
      result[type] = designs;
    }
  }

  return result;
}

/**
 * Type guard to check if a string is a valid design type
 */
export function isValidDesignType(type: string): type is DesignType {
  return ['analytic', 'measurement', 'research', 'sampling'].includes(type);
}

/**
 * Check if a locale is supported
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return ['en', 'es', 'fr', 'de', 'zh'].includes(locale);
}
