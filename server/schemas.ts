import { Schema, Type } from '@google/genai';

export const actionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isDangerous: { type: Type.BOOLEAN, description: "True if the action is extreme, illegal, or very dangerous." },
    dangerWarning: { type: Type.STRING, description: "A warning message if the action is dangerous, explaining the risks." },
    narrative: { type: Type.STRING, description: "The result of the action, told in second person ('You do x...')." },
    taskSummary: { type: Type.STRING, description: "If a long task is started, provide a 3-5 word summary of the task (e.g., 'Se dirige vers le café', 'Travaille au bureau')." },
    durationMinutes: { type: Type.INTEGER, description: "Estimated duration of the action in game minutes (1 real min = 1 game min) for NEW tasks. DO NOT return this if the player is already doing a task." },
    taskTimeAdjustmentMinutes: { type: Type.INTEGER, description: "Only if a task is currently active: add or remove minutes from the current active task based on this action (e.g., -10 to reduce time left, +10 if it takes longer)." },
    choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 pre-generated natural choices to continue the story." },
    vitalsImpact: { 
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.INTEGER, description: "Delta on energy (-100 to +100). MUST be negative (-1 to -8) for normal waking activities. ONLY positive (+25 to +100) if the player explicitly sleeps, naps, or rests." },
        hunger: { type: Type.INTEGER, description: "Delta on satiety (-100 to +100). MUST be negative (-1 to -6) during daytime. ONLY positive (+20 to +60) if the player explicitly eats a meal/snack or drinks a caloric beverage. NEVER positive without food." },
        hygiene: { type: Type.INTEGER, description: "Delta on hygiene (-100 to +100). Drops (-2 to -15) for dirty or strenuous tasks. ONLY positive (+25 to +100) if the player washes hands, grooms, or showers." },
        mood: { type: Type.INTEGER, description: "Delta on mood (-25 to +25) reflecting emotional experience." },
        mindset: { type: Type.INTEGER, description: "Delta impact on Mindset (-20 to +20). Negative = Tendu/Red, Positive = À l'aise/Green." }
      }
    },
    moneyImpact: {
      type: Type.OBJECT,
      properties: {
        checkingDelta: { type: Type.INTEGER },
        savingsDelta: { type: Type.INTEGER },
        debtsDelta: { type: Type.INTEGER },
        reason: { type: Type.STRING, description: "Precise motif or label for the bank transaction in French (e.g., 'Achat café & croissant', 'Achat ticket de bus', 'Courses au supermarché', 'Achat journal'). ALWAYS provide a clear, specific description!" }
      }
    },
    inventoryUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING, description: "Item name in French (e.g. 'Paquet de pâtes (500g)', 'Boîte de 6 œufs', 'Café', 'Pass magnétique')." },
          category: { type: Type.STRING, enum: ['nourriture', 'boisson', 'hygiene', 'vetements', 'outils', 'technologie', 'livres_documents', 'clefs_pass', 'divers'] },
          quantityDelta: { type: Type.INTEGER, description: "Positive to add/gain items (e.g. +1, +2), negative to consume/use/drop items (e.g. -1)." },
          location: { type: Type.STRING, enum: ['personnage', 'appartement'], description: "'personnage' for carried items, 'appartement' for items in fridge/cupboards." },
          description: { type: Type.STRING, description: "Brief description of the item." },
          freshness: { type: Type.STRING, enum: ['frais', 'perime', 'sec', 'entame'] },
          consumable: { type: Type.BOOLEAN }
        },
        required: ["name", "quantityDelta", "location"]
      }
    },
    newCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          locationEncountered: { type: Type.STRING, description: "Precise location where the player met or interacted with them." },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          age: { type: Type.STRING, description: "e.g. '28 ans', 'Une quarantaine d'années', '65 ans'" },
          appearance: { type: Type.STRING, description: "Detailed physical description: stature, face, gaze, hair, clothes, style, demeanor. NEVER leave empty!" },
          occupation: { type: Type.STRING, description: "Specific profession, job title, or role in the city. NEVER leave empty!" },
          background: { type: Type.STRING, description: "Backstory, personality, origin, motivation, and shared history or impression with the player. NEVER leave empty!" },
          financialRelation: { type: Type.STRING, description: "Debts, loans, contractual deals, or financial arrangements." },
          pendingItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tasks, promises or obligations with this character." },
          upcomingEvents: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Scheduled meetings or appointments." },
          socialTies: {
            type: Type.ARRAY,
            description: "Relationships with other characters in the city (allies, rivals, partners, family).",
            items: {
              type: Type.OBJECT,
              properties: {
                targetCharacterId: { type: Type.STRING },
                targetCharacterName: { type: Type.STRING },
                relationshipType: { type: Type.STRING, enum: ['ami', 'associe', 'rival', 'famille', 'creancier', 'amoureux'] },
                dynamicSummary: { type: Type.STRING, description: "Short summary of their dynamic e.g. 'Travaillent ensemble sur les quais'" }
              }
            }
          },
          favorBalance: { type: Type.INTEGER, description: "> 0 if the NPC owes the player a favor, < 0 if the player is indebted to the NPC" },
          notes: { type: Type.STRING, description: "Synthetic summary of interactions and remarks. NEVER leave empty!" }
        },
        required: ["id", "name"]
      }
    },
    newLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre'] },
          district: { type: Type.STRING, description: "District or neighborhood name (e.g. 'Quartier Saint-Michel')." },
          description: { type: Type.STRING, description: "Rich, vivid, sensory description: architecture, lighting under the 36-hour cycle, scents, atmosphere, and vibe. NEVER leave empty!" },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 to 5 key amenities or distinct features (e.g. ['Terrasse ombragée', 'Comptoir en zinc', 'Wifi public']). NEVER leave empty!" },
          associatedCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs or names of characters associated with this location." },
          openingHours: {
            type: Type.OBJECT,
            properties: {
              openHour: { type: Type.INTEGER, description: "Hour of opening in 36h cycle (e.g. 10)" },
              closeHour: { type: Type.INTEGER, description: "Hour of closing in 36h cycle (e.g. 28)" }
            }
          },
          notes: { type: Type.STRING, description: "Practical utility or personal reflection on the place. NEVER leave empty!" },
          discoveredGameDate: { type: Type.INTEGER }
        },
        required: ["id", "name"]
      }
    },
    skillsImpact: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          practicePointsDelta: { type: Type.INTEGER }
        }
      }
    },
    updatedCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          age: { type: Type.STRING },
          appearance: { type: Type.STRING },
          occupation: { type: Type.STRING },
          background: { type: Type.STRING },
          financialRelation: { type: Type.STRING },
          pendingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          upcomingEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
          currentLocationId: { type: Type.STRING, description: "ID of the location where the NPC currently is (e.g. 'loc-bistro-saint-michel')" },
          socialTies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                targetCharacterId: { type: Type.STRING },
                targetCharacterName: { type: Type.STRING },
                relationshipType: { type: Type.STRING, enum: ['ami', 'associe', 'rival', 'famille', 'creancier', 'amoureux'] },
                dynamicSummary: { type: Type.STRING }
              }
            }
          },
          favorDelta: { type: Type.INTEGER, description: "+1 if the player helped them, -1 if the player asked a favor" },
          notesAppend: { type: Type.STRING },
          notesReplace: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    updatedLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre'] },
          district: { type: Type.STRING },
          description: { type: Type.STRING },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
          associatedCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
          accessLevel: { type: Type.STRING, enum: ['libre', 'ticket_requis', 'pass_securite', 'ferme_nuit', 'inconnu'] },
          temporaryStatus: {
            type: Type.OBJECT,
            properties: {
              isClosed: { type: Type.BOOLEAN },
              reason: { type: Type.STRING, description: "e.g. 'Fermé pour inventaire', 'Travaux de voirie'" }
            }
          },
          openingHours: {
            type: Type.OBJECT,
            properties: {
              openHour: { type: Type.INTEGER },
              closeHour: { type: Type.INTEGER }
            }
          },
          notesAppend: { type: Type.STRING },
          notesReplace: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    newAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dateGameStr: { type: Type.STRING, description: "e.g. 'Demain 15:00', 'Jour 4 - 09:00', 'Dans 2 jours'" },
          category: { type: Type.STRING, enum: ['travail', 'rdv', 'personnel', 'finance', 'urgent'] },
          completed: { type: Type.BOOLEAN }
        },
        required: ["title"]
      }
    },
    updatedAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dateGameStr: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['travail', 'rdv', 'personnel', 'finance', 'urgent'] },
          completed: { type: Type.BOOLEAN }
        },
        required: ["id"]
      }
    },
    activePlotHooks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 2 to 4 active forward-looking plot hooks or background threads to maintain continuous narrative momentum."
    },
    newPlotLeads: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        title: { type: Type.STRING },
        category: { type: Type.STRING, enum: ["emploi", "mystere", "quartier", "personnel", "finance"] },
        status: { type: Type.STRING, enum: ["actif", "en_pause", "resolu", "abandonne", "expire"] },
        qualitativeStage: { type: Type.STRING },
        clues: { type: Type.ARRAY, items: { type: Type.STRING } },
        relatedCharacterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        relatedLocationIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        expiryWarningText: { type: Type.STRING, description: "Qualitative deadline warning e.g. 'Opportunité valable jusqu'à la fin de la journée'" },
        expiredReason: { type: Type.STRING, description: "Why the lead expired if applicable" },
        notes: { type: Type.STRING }
      }}
    },
    updatedPlotLeads: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        id: { type: Type.STRING },
        qualitativeStage: { type: Type.STRING },
        newClues: { type: Type.ARRAY, items: { type: Type.STRING } },
        status: { type: Type.STRING, enum: ["actif", "en_pause", "resolu", "abandonne", "expire"] },
        expiryWarningText: { type: Type.STRING },
        expiredReason: { type: Type.STRING }
      }}
    },
    newRumors: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        text: { type: Type.STRING },
        source: { type: Type.STRING },
        credibility: { type: Type.STRING, enum: ["faible", "plausible", "averee"] },
        district: { type: Type.STRING }
      }}
    },
    newMessages: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        senderId: { type: Type.STRING, description: "ID of the character or system" },
        senderName: { type: Type.STRING },
        preview: { type: Type.STRING },
        content: { type: Type.STRING },
        replyOptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      }}
    },
    newMarketTrends: {
      type: Type.ARRAY,
      description: "Local economic trends or price shifts (e.g. food scarcity, sales, transit price changes).",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ['nourriture', 'technologie', 'transport', 'energie', 'loyer', 'divers'] },
          label: { type: Type.STRING },
          priceMultiplier: { type: Type.NUMBER, description: "Multiplier e.g. 1.25 for +25%, 0.8 for -20%" },
          reason: { type: Type.STRING },
          district: { type: Type.STRING },
          expiresAtGameDate: { type: Type.INTEGER }
        },
        required: ["label", "priceMultiplier", "reason"]
      }
    },
    episodicMemory: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A concise 1-2 sentence factual episodic memory summary of what just transpired." },
        importance: { type: Type.STRING, enum: ['haute', 'moyenne', 'critique'] },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 semantic keywords" }
      },
      description: "Generates a compressed episodic memory chunk when something memorable occurred."
    },
    diaryEntry: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Poetic or evocative title for the journal entry." },
        content: { type: Type.STRING, description: "First-person reflective journal entry written in the character's voice." },
        category: { type: Type.STRING, enum: ['souvenir', 'reflexion', 'secret', 'objectif'] },
        mood: { type: Type.STRING, description: "Dominant emotional mood." },
        milestone: { type: Type.BOOLEAN, description: "True if this marks a significant life event." }
      },
      required: ["title", "content"]
    }
  },
  required: ["isDangerous", "narrative", "choices"]
};

export const offlineRecapSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrativeRecap: {
      type: Type.STRING,
      description: "A rich, vivid, multi-paragraph recap in French (2nd person 'Vous...') detailing chronologically what the character did during absence."
    },
    events: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 5 key bullet points of significant occurrences during this period."
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timeRange: { type: Type.STRING },
          summary: { type: Type.STRING }
        }
      }
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 actionable suggested choices right now."
    },
    vitalsImpact: {
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.INTEGER },
        hunger: { type: Type.INTEGER },
        hygiene: { type: Type.INTEGER },
        mood: { type: Type.INTEGER },
        mindset: { type: Type.INTEGER }
      }
    },
    moneyImpact: {
      type: Type.OBJECT,
      properties: {
        checkingDelta: { type: Type.INTEGER },
        savingsDelta: { type: Type.INTEGER },
        debtsDelta: { type: Type.INTEGER },
        reason: { type: Type.STRING }
      }
    },
    inventoryUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['nourriture', 'boisson', 'hygiene', 'vetements', 'outils', 'technologie', 'livres_documents', 'clefs_pass', 'divers'] },
          quantityDelta: { type: Type.INTEGER },
          location: { type: Type.STRING, enum: ['personnage', 'appartement'] },
          description: { type: Type.STRING },
          freshness: { type: Type.STRING, enum: ['frais', 'perime', 'sec', 'entame'] },
          consumable: { type: Type.BOOLEAN }
        },
        required: ["name", "quantityDelta", "location"]
      }
    },
    skillsImpact: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          practicePointsDelta: { type: Type.INTEGER }
        }
      }
    },
    newCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          locationEncountered: { type: Type.STRING },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          age: { type: Type.STRING },
          appearance: { type: Type.STRING },
          occupation: { type: Type.STRING },
          background: { type: Type.STRING },
          financialRelation: { type: Type.STRING },
          pendingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          upcomingEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING }
        },
        required: ["id", "name"]
      }
    },
    newLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre'] },
          district: { type: Type.STRING },
          description: { type: Type.STRING },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
          associatedCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING },
          discoveredGameDate: { type: Type.NUMBER }
        }
      }
    },
    updatedCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          currentLocationId: { type: Type.STRING },
          notesAppend: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    updatedLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          accessLevel: { type: Type.STRING, enum: ['libre', 'ticket_requis', 'pass_securite', 'ferme_nuit', 'inconnu'] },
          temporaryStatus: {
            type: Type.OBJECT,
            properties: {
              isClosed: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            }
          },
          notesAppend: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    newAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dateGameStr: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['travail', 'rdv', 'personnel', 'finance', 'urgent'] },
          completed: { type: Type.BOOLEAN }
        },
        required: ["title"]
      }
    },
    updatedAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          completed: { type: Type.BOOLEAN }
        },
        required: ["id"]
      }
    },
    newMessages: {
      type: Type.ARRAY,
      description: "Passive narrative events: Messages received from contacts while the character was sleeping or busy.",
      items: {
        type: Type.OBJECT,
        properties: {
          senderId: { type: Type.STRING },
          senderName: { type: Type.STRING },
          preview: { type: Type.STRING },
          content: { type: Type.STRING },
          timestampGameDateStr: { type: Type.STRING },
          replyOptions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["senderName", "content"]
      }
    },
    newPlotLeads: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['emploi', 'mystere', 'quartier', 'personnel', 'finance'] },
          qualitativeStage: { type: Type.STRING },
          clues: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING, enum: ['actif', 'en_pause', 'resolu', 'abandonne', 'expire'] },
          expiryWarningText: { type: Type.STRING },
          expiredReason: { type: Type.STRING }
        },
        required: ["title"]
      }
    },
    updatedPlotLeads: {
      type: Type.ARRAY,
      description: "Plot leads that expired or evolved naturally while the character was asleep/absent.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          qualitativeStage: { type: Type.STRING },
          newClues: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING, enum: ['actif', 'en_pause', 'resolu', 'abandonne', 'expire'] },
          expiryWarningText: { type: Type.STRING },
          expiredReason: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    newRumors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          source: { type: Type.STRING },
          credibility: { type: Type.STRING, enum: ['faible', 'plausible', 'averee'] },
          district: { type: Type.STRING }
        },
        required: ["text"]
      }
    },
    socialEvents: {
      type: Type.ARRAY,
      description: "Autonomous social events between NPCs (alliances, partnerships, arguments, gossip) that unfolded during absence.",
      items: { type: Type.STRING }
    },
    newMarketTrends: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ['nourriture', 'technologie', 'transport', 'energie', 'loyer', 'divers'] },
          label: { type: Type.STRING },
          priceMultiplier: { type: Type.NUMBER },
          reason: { type: Type.STRING },
          district: { type: Type.STRING },
          expiresAtGameDate: { type: Type.INTEGER }
        },
        required: ["label", "priceMultiplier", "reason"]
      }
    },
    diaryEntry: {
      type: Type.OBJECT,
      description: "An introspective first-person diary entry summarizing the character's personal feelings during absence.",
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        category: { type: Type.STRING, enum: ['absence', 'souvenir', 'reflexion'] },
        mood: { type: Type.STRING },
        milestone: { type: Type.BOOLEAN }
      },
      required: ["title", "content"]
    },
    episodicMemory: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A concise factual episodic memory summary of the offline period." },
        importance: { type: Type.STRING, enum: ['haute', 'moyenne', 'critique'] },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  },
  required: ["narrativeRecap"]
};

export const taskProgressSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrativeSnippet: { type: Type.STRING, description: "A rich, vivid situational description in French (2nd person 'Vous...')." },
    choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 distinct actionable choices." },
    vitalsImpact: {
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.INTEGER },
        hunger: { type: Type.INTEGER },
        hygiene: { type: Type.INTEGER },
        mood: { type: Type.INTEGER },
        mindset: { type: Type.INTEGER }
      }
    },
    taskTimeAdjustmentMinutes: {
      type: Type.INTEGER,
      description: "Optional immediate delta in task minutes (-30 to +30)."
    }
  },
  required: ["narrativeSnippet", "choices"]
};

export const introspectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Poetic and reflective title." },
    content: { type: Type.STRING, description: "Profound first-person journal entry (3-4 paragraphs)." },
    mood: { type: Type.STRING, description: "Current emotional mood." },
    category: { type: Type.STRING, enum: ['reflexion', 'souvenir', 'objectif', 'secret'] },
    milestone: { type: Type.BOOLEAN }
  },
  required: ["title", "content", "mood"]
};
