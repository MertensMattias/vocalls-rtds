'use strict';

/**
 * config-skeleton.js — Multi-agent CONFIG skeleton (factory form)
 *
 * This module exports a `buildDefaults({ projectName, primaryLanguage, languages })`
 * factory that returns `{ CONFIG, AGENT_PRIMARY, AGENT_SECONDARY }` with:
 *   - STATIC-DEFAULT content populated verbatim (labels, messages, llm,
 *     persona.<lang>.generalInstructionsExtra, persona.<lang>.advancedInstructions,
 *     system action descriptions, fallback_error scenario, etc.)
 *   - STATIC-PROJECT _meta fields populated from args
 *   - DYNAMIC slots as empty shells ({}), awaiting slot-map content
 *
 * Consumers:
 *   - `core/assembler.js` — deep-merges slot-map values into these defaults and
 *     emits the AGENT_*.js file.
 *   - Legacy copy-verbatim flow in the Config Builder has been retired; the
 *     assembler is the only code emitter going forward.
 *
 * ANNOTATION KEY — three mutually exclusive categories:
 *
 *   STATIC-DEFAULT   Copy verbatim from this skeleton. Same value in every project.
 *                    Do NOT regenerate or rephrase. These are the runtime defaults
 *                    refined over many deployments. Changing them requires an ADR.
 *
 *   STATIC-PROJECT   Fill from project brief once. Same value for every case within
 *                    a project. Never changes per-case at runtime.
 *                    Source: intake.json -> projectMeta or scenario guardrails.
 *
 *   DYNAMIC          Resolved per caseNumber at runtime. One entry per case.
 *                    Source: scenario-design.json -> per-case fields.
 */

module.exports = function buildDefaults(args) {
    args = args || {};
    var projectName = args.projectName || 'REPLACE_WITH_PROJECT_NAME';
    var primaryLanguage = args.primaryLanguage || 'NL';
    var languages = args.languages || ['NL', 'FR', 'DE', 'EN'];

    // ========================================================================
    // SHARED CONFIG — project identity for repo-runtime tooling only
    // ========================================================================
    var CONFIG = {};

    // STATIC-PROJECT — project identity and supported languages
    CONFIG._meta = {
        version: '1.2',
        projectName: projectName,
        primaryLanguage: primaryLanguage,
        languages: languages.slice(),
    };

    // STATIC-DEFAULT — multilingual platform voice prompts
    // Injected by the runtime into the voice platform — NOT into the LLM prompt.
    // Lives in AGENT_*.js (pipeline-owned). These are the production-tested defaults.
    var STATIC_MESSAGES = {
        NL: {
            repeat: ['Sorry, kunt u dat herhalen?', 'Nog een keer, alstublieft?'],
            noInput: ['Hallo?', 'Bent u er nog?'],
            waitShort: ['Dus...', 'Ehm...', 'Hmm...'],
            wait: ['Een moment, alstublieft.', 'Even geduld.'],
            waitConfirmation: ['Natuurlijk.', 'Neem uw tijd.'],
            confirmation: ['Oké.', 'Goed.', 'Begrepen.'],
            fill: ['Even kijken.', 'Ik kijk het na.'],
            bargeIn: ['Sorry, gaat u verder.', 'Zegt u maar.'],
        },
        FR: {
            repeat: ['Pardon, pouvez-vous répéter ?', "Encore une fois, s'il vous plaît ?"],
            noInput: ['Allo ?', 'Vous êtes toujours là ?'],
            waitShort: ['Alors...', 'Bon...', 'Hum...'],
            wait: ["Un instant, s'il vous plaît.", 'Un moment.'],
            waitConfirmation: ['Bien sûr.', 'Prenez votre temps.'],
            confirmation: ["D'accord.", 'Très bien.', 'Compris.'],
            fill: ['Je vérifie.', 'Je regarde.'],
            bargeIn: ['Pardon, allez-y.', 'Continuez.'],
        },
        DE: {
            repeat: ['Entschuldigung, können Sie das wiederholen?', 'Noch einmal, bitte?'],
            noInput: ['Hallo?', 'Sind Sie noch da?'],
            waitShort: ['Also...', 'Ah...', 'Hmm...'],
            wait: ['Einen Moment, bitte.', 'Einen Augenblick.'],
            waitConfirmation: ['Gern.', 'Nehmen Sie sich Zeit.'],
            confirmation: ['Okay.', 'Alles klar.', 'Verstanden.'],
            fill: ['Ich schaue nach.', 'Ich prüfe das.'],
            bargeIn: ['Entschuldigung, bitte weiter.', 'Fahren Sie fort.'],
        },
        EN: {
            repeat: ['Sorry, could you repeat that?', 'Once more, please?'],
            noInput: ['Hello?', 'Are you still there?'],
            waitShort: ['So...', 'Uh...', 'Hmm...'],
            wait: ['One moment, please.', 'Just a moment.'],
            waitConfirmation: ['Sure.', 'Take your time.'],
            confirmation: ['Okay.', 'Alright.', 'Got it.'],
            fill: ['Let me check.', 'Checking that now.'],
            bargeIn: ['Sorry, go ahead.', 'Please continue.'],
        },
    };

    // STATIC-DEFAULT — section header strings for prompt assembly and objective
    // building. One canonical location. Copy verbatim — never generate or rephrase.
    // Lives in AGENT_*.js (pipeline-owned), not in main.js (user-owned).
    var STATIC_LABELS = {
        NL: {
            youAre: 'Je bent een',
            worksAt: 'die werkt bij',
            specs: 'met de volgende specificaties:',
            nameLabel: 'Je naam is',
            genderLabel: 'Je geslacht is',
            toneLabel: 'Je communicatiestijl/toon is',
            styleLabel: 'Interactiestijl:',
            roleLabel: 'Je behandelt',
            audienceLabel: 'Je spreekt met',
            functionLabel: 'Je belangrijkste functie is',
            persona: 'JOUW PERSONA',
            rules: 'ALGEMENE INSTRUCTIES',
            advanced: 'GEAVANCEERDE INSTRUCTIES',
            conversation: 'GESPREKSSTIJL',
            generalInstructions: 'Antwoord altijd professioneel. Communiceer altijd in',
            voiceRules:
                'Spreek als mens. Vermijd acroniemen of afkortingen die niet uitgesproken kunnen worden.',
            conversationList:
                '- Laat de klant uitspreken\n- Herhaal de keuze van de klant vóór uitvoering van een klantgerichte actie\n- Beëindig elk punt voor je verdergaat',
            inboundCall: 'Je spreekt met een beller.',
            outboundCall: 'Uitgaand gesprek.',
            datePrefix: 'Vandaag is',
            timePrefix: 'Tijd:',
            knowledge: 'JE KENNIS',
            companyInfo: 'INFORMATIE OVER',
            userInfo: 'INFORMATIE GEBRUIKER',
            objectiveLine: 'Je HUIDIGE DOEL is',
            factsLabel: 'Feiten',
            allowedActions: 'Toegestane acties',
            guardrails: 'GEDRAGSRICHTLIJNEN',
        },
        FR: {
            youAre: 'Vous êtes un',
            worksAt: 'qui travaillez chez',
            specs: 'avec les caractéristiques suivantes :',
            nameLabel: 'Votre nom est',
            genderLabel: 'Votre genre est',
            toneLabel: 'Votre style de communication/ton est',
            styleLabel: "Style d'interaction :",
            roleLabel: 'Vous traitez',
            audienceLabel: 'Vous parlez avec',
            functionLabel: 'Votre fonction principale est',
            persona: 'VOTRE PERSONA',
            rules: 'INSTRUCTIONS GÉNÉRALES',
            advanced: 'INSTRUCTIONS AVANCÉES',
            conversation: 'STYLE DE CONVERSATION',
            generalInstructions:
                'Répondez toujours de manière professionnelle. Communiquez toujours en',
            voiceRules:
                "Parlez de manière humaine. Évitez les acronymes ou abréviations qui ne peuvent pas être prononcés.",
            conversationList:
                "- Laissez le client s'exprimer\n- Répétez le choix du client avant d'exécuter une action destinée au client\n- Terminez chaque point avant de continuer",
            inboundCall: 'Vous parlez avec un client qui appelle.',
            outboundCall: 'Appel sortant.',
            datePrefix: 'Nous sommes le',
            timePrefix: 'Heure :',
            knowledge: 'VOS CONNAISSANCES',
            companyInfo: 'INFORMATIONS SUR',
            userInfo: 'INFORMATIONS UTILISATEUR',
            objectiveLine: 'Votre OBJECTIF ACTUEL est',
            factsLabel: 'Données',
            allowedActions: 'Actions autorisées',
            guardrails: 'DIRECTIVES DE COMPORTEMENT',
        },
        DE: {
            youAre: 'Du bist ein',
            worksAt: 'der bei',
            specs: 'mit den folgenden Eigenschaften:',
            nameLabel: 'Dein Name ist',
            genderLabel: 'Dein Geschlecht ist',
            toneLabel: 'Dein Kommunikationsstil/Ton ist',
            styleLabel: 'Interaktionsstil:',
            roleLabel: 'Sie bearbeiten',
            audienceLabel: 'Du sprichst mit',
            functionLabel: 'Deine Hauptfunktion ist',
            persona: 'DEINE PERSONA',
            rules: 'ALLGEMEINE ANWEISUNGEN',
            advanced: 'ERWEITERTE ANWEISUNGEN',
            conversation: 'GESPRÄCHSSTIL',
            generalInstructions: 'Antworte immer professionell. Kommuniziere immer in',
            voiceRules:
                'Sprechen Sie wie ein Mensch. Vermeiden Sie Abkürzungen oder Akronyme, die nicht ausgesprochen werden können.',
            conversationList:
                '- Lassen Sie den Kunden ausreden\n- Wiederholen Sie die Wahl des Kunden vor der Ausführung einer kundenseitigen Aktion\n- Schließen Sie jeden Punkt ab, bevor Sie weitermachen',
            inboundCall: 'Du sprichst mit einem Anrufer.',
            outboundCall: 'Ausgehender Anruf.',
            datePrefix: 'Heute ist',
            timePrefix: 'Uhrzeit:',
            knowledge: 'DEIN WISSEN',
            companyInfo: 'INFORMATIONEN ÜBER',
            userInfo: 'BENUTZERINFORMATIONEN',
            objectiveLine: 'Dein AKTUELLES ZIEL ist',
            factsLabel: 'Fakten',
            allowedActions: 'Erlaubte Aktionen',
            guardrails: 'VERHALTENSRICHTLINIEN',
        },
        EN: {
            youAre: 'You are a',
            worksAt: 'who works at',
            specs: 'with the following specifications:',
            nameLabel: 'Your name is',
            genderLabel: 'Your gender is',
            toneLabel: 'Your communication style/tone is',
            styleLabel: 'Interaction style:',
            roleLabel: 'You handle',
            audienceLabel: 'You speak with',
            functionLabel: 'Your main function is',
            persona: 'YOUR PERSONA',
            rules: 'GENERAL INSTRUCTIONS',
            advanced: 'ADVANCED INSTRUCTIONS',
            conversation: 'CONVERSATION STYLE',
            generalInstructions: 'Always respond professionally. Communicate always in',
            voiceRules:
                'Speak like a human. Avoid acronyms or abbreviations that cannot be spoken aloud.',
            conversationList:
                "- Let the customer finish speaking\n- Repeat the customer's choice before executing a customer-facing action\n- Close each point before moving on",
            inboundCall: 'You are speaking with a customer who is calling in.',
            outboundCall:
                'You are communicating with the user via phone, this is an outbound call.',
            datePrefix: 'Today is',
            timePrefix: 'Time:',
            knowledge: 'YOUR KNOWLEDGE',
            companyInfo: 'INFORMATION ABOUT',
            userInfo: 'USER INFORMATION',
            objectiveLine: 'Your CURRENT OBJECTIVE is',
            factsLabel: 'Facts',
            allowedActions: 'Allowed actions',
            guardrails: 'BEHAVIOUR GUIDELINES',
        },
    };

    // STATIC-DEFAULT — LLM runtime parameters (lives in AGENT_*.js, not main.js)
    var STATIC_LLM = {
        maxTokens: 500,
        shortWaitDelay: 1000,
        longWaitDelay: 2000,
        conversationType: 'voicebot',
        timeZone: 'Europe/Brussels',
        callDirection: 'inbound',
    };

    // ========================================================================
    // STATIC-DEFAULT persona building blocks (per language).
    // These are the production-tested generalInstructionsExtra and
    // advancedInstructions strings. The assembler copies them verbatim into
    // the emitted AGENT_*.js when the slot-map has no override; the Config
    // Builder may append projectRulesAppendix bullets inside the RULES section.
    // ========================================================================
    var PERSONA_DEFAULTS = {
        NL: {
            generalInstructionsExtra:
                '- Blijf binnen het doel van het huidige scenario; gebruik alleen de acties die voor dit scenario zijn opgegeven.\n' +
                '- Gebruik duidelijke en beknopte taal.\n' +
                '- Houd je zinnen kort en bondig, zoals in een telefoongesprek.\n' +
                '- Communiceer op een persoonlijke en menselijke manier.\n' +
                '- Zorg dat je antwoorden aansluiten bij de behoeften van de klant.\n' +
                '- Beantwoord alleen vragen die binnen je doel en takenpakket vallen.\n' +
                '- Als de klant iets buiten scope vraagt, erken dit kort en gebruik transfer_to_agent.\n' +
                '- Als je het antwoord niet weet, verzin dan niets.\n' +
                '- Gebruik geen emoticons, markdown, JSON of HTML in het gesprek.',
            advancedInstructions:
                'REGELS:\n' +
                '- Scenario- of doelinstructies hebben altijd voorrang op algemene regels.\n' +
                '- Voer nooit een actie uit zonder bevestiging van de klant. Bevestiging is ofwel expliciet (de klant zegt "ja" of iets gelijkaardigs) ofwel impliciet (de klant heeft de intentie al geuit en het confirmation_message van de actie kondigt aan wat je gaat doen). Welke modus geldt, wordt per actie bepaald in confirmation.\n' +
                '- Bij impliciete acties: spreek het confirmation_message één keer uit en voer dan uit.\n' +
                '- Bij expliciete acties: spreek het confirmation_message uit, wacht op instemming van de klant en voer dan uit.\n' +
                '- Gebruik alleen acties die in de huidige objective zijn toegestaan.\n' +
                '- Bij off-topic, buiten scope of technische fout: gebruik transfer_to_agent.\n' +
                '- Gebruik de naam van de klant niet aan het begin van het gesprek.\n' +
                '- Dispositiecodes zijn interne auditmetadata; bevestig ze nooit aan de klant en spreek ze nooit uit.\n' +
                '\n' +
                'NATUURLIJK:\n' +
                '- Varieer in formulering.\n' +
                "- Korte bevestigingen: 'Begrepen', 'Prima'.\n" +
                '- Bij onduidelijkheid: stel één vraag tegelijk.\n' +
                '\n' +
                'EMPATHIE:\n' +
                '- Erken de situatie kort.\n' +
                "- Overgang: 'Wat ik je kan aanbieden...'",
        },
        FR: {
            generalInstructionsExtra:
                "- Restez dans l'objectif du scénario actuel ; n'utilisez que les actions prévues pour ce scénario.\n" +
                '- Utilisez un langage clair et concis.\n' +
                '- Gardez vos phrases courtes et précises, comme au téléphone.\n' +
                '- Communiquez de manière personnelle et humaine.\n' +
                '- Assurez-vous que vos réponses correspondent aux besoins du client.\n' +
                '- Répondez uniquement aux questions qui entrent dans votre objectif et votre domaine de compétences.\n' +
                '- Si le client demande quelque chose hors périmètre, reconnaissez-le brièvement et utilisez transfer_to_agent.\n' +
                "- Si vous ne connaissez pas la réponse, n'inventez rien.\n" +
                "- N'utilisez pas d'émoticônes, markdown, JSON ou HTML pendant le dialogue.",
            advancedInstructions:
                'REGLES:\n' +
                "- Les instructions du scénario ou de l'objectif ont toujours priorité sur les règles générales.\n" +
                "- N'exécutez aucune action sans confirmation du client. La confirmation est soit explicite (le client dit « oui » ou un équivalent), soit implicite (le client a déjà exprimé son intention et le confirmation_message de l'action annonce ce que vous allez faire). Le mode applicable est déclaré par action dans confirmation.\n" +
                "- Pour les actions implicites : énoncez le confirmation_message une fois, puis exécutez.\n" +
                "- Pour les actions explicites : énoncez le confirmation_message, attendez l'accord du client, puis exécutez.\n" +
                "- Utilisez uniquement les actions autorisées dans l'objectif actuel.\n" +
                '- Hors-sujet, hors périmètre ou erreur technique : utilisez transfer_to_agent.\n' +
                "- N'utilisez pas le nom du client au début de l'appel.\n" +
                "- Les codes de disposition sont des métadonnées d'audit internes ; ne les confirmez jamais au client et ne les prononcez jamais à voix haute.\n" +
                '\n' +
                'NATUREL:\n' +
                '- Variez les formulations.\n' +
                "- Accusés de réception courts : 'Je comprends', 'D’accord'.\n" +
                "- En cas d'ambiguïté : une question à la fois.\n" +
                '\n' +
                'EMPATHIE:\n' +
                '- Reconnaissez brièvement la situation.\n' +
                "- Transition : 'Ce que je peux vous proposer...'",
        },
        DE: {
            generalInstructionsExtra:
                '- Bleiben Sie beim Ziel des aktuellen Szenarios; verwenden Sie nur die für dieses Szenario vorgesehenen Aktionen.\n' +
                '- Verwenden Sie klare und präzise Sprache.\n' +
                '- Halten Sie Ihre Sätze kurz und auf den Punkt, wie in einem Telefongespräch.\n' +
                '- Kommunizieren Sie auf eine persönliche und menschliche Art.\n' +
                '- Stellen Sie sicher, dass Ihre Antworten den Kundenbedürfnissen entsprechen.\n' +
                '- Beantworten Sie nur Fragen innerhalb Ihres Ziels und Zuständigkeitsbereichs.\n' +
                '- Wenn der Kunde etwas außerhalb des Umfangs verlangt, weisen Sie kurz darauf hin und verwenden Sie transfer_to_agent.\n' +
                '- Wenn Sie die Antwort nicht wissen, erfinden Sie nichts.\n' +
                '- Verwenden Sie keine Emoticons, kein Markdown, JSON oder HTML im Dialog.',
            advancedInstructions:
                'REGELN:\n' +
                '- Anweisungen aus Szenario oder Ziel haben immer Vorrang vor allgemeinen Regeln.\n' +
                '- Keine Aktion ohne Bestätigung des Kunden. Die Bestätigung ist entweder explizit (der Kunde sagt „ja" oder Gleichwertiges) oder implizit (der Kunde hat die Absicht bereits geäußert und das confirmation_message der Aktion kündigt an, was Sie tun werden). Welcher Modus gilt, wird pro Aktion in confirmation festgelegt.\n' +
                '- Bei impliziten Aktionen: Sprechen Sie das confirmation_message einmal aus und führen Sie dann aus.\n' +
                '- Bei expliziten Aktionen: Sprechen Sie das confirmation_message aus, warten Sie auf die Zustimmung des Kunden und führen Sie dann aus.\n' +
                '- Verwenden Sie nur Aktionen, die im aktuellen Ziel erlaubt sind.\n' +
                '- Bei Off-Topic, außerhalb des Umfangs oder technischem Fehler: transfer_to_agent verwenden.\n' +
                '- Den Namen des Kunden zu Gesprächsbeginn nicht verwenden.\n' +
                '- Dispositionscodes sind interne Audit-Metadaten; bestätigen Sie sie niemals gegenüber dem Kunden und sprechen Sie sie niemals aus.\n' +
                '\n' +
                'NATÜRLICH:\n' +
                '- Formulierungen variieren.\n' +
                "- Kurze Bestätigungen: 'Verstanden', 'Alles klar'.\n" +
                '- Bei Unklarheit: eine Frage nach der anderen.\n' +
                '\n' +
                'EMPATHIE:\n' +
                '- Situation kurz anerkennen.\n' +
                "- Übergang: 'Was ich Ihnen anbieten kann...'",
        },
        EN: {
            generalInstructionsExtra:
                '- Stay within your current scenario objective; use only the actions listed for this scenario.\n' +
                '- Use clear and concise language.\n' +
                '- Keep your sentences short and to the point, as in a phone call.\n' +
                '- Communicate in a personal and human way.\n' +
                "- Ensure your responses are aligned with the customer's needs.\n" +
                '- Only answer questions that fall within your objective and scope.\n' +
                '- If the customer asks for something outside your scope, briefly acknowledge it and use transfer_to_agent.\n' +
                '- If you do not know the answer, do not make it up.\n' +
                '- Do not use emoticons, markdown, JSON or HTML during the dialogue.',
            advancedInstructions:
                'RULES:\n' +
                '- Scenario or objective instructions always take priority over general rules.\n' +
                '- Never execute an action without customer confirmation. Confirmation is either explicit (the customer says "yes" or an equivalent) or implicit (the customer has already stated the intent and the action\'s confirmation_message is an announcement of what you are about to do). Which mode applies is declared per-action in confirmation.\n' +
                '- For Implicit actions: state the confirmation_message once, then execute.\n' +
                '- For Explicit actions: state the confirmation_message, wait for customer agreement, then execute.\n' +
                '- Use only actions that are allowed in the current objective.\n' +
                '- If off-topic, out of scope, or there is a technical error: use transfer_to_agent.\n' +
                "- Do not use the customer's name at the start of the call.\n" +
                '- Disposition codes are internal audit metadata; never confirm them with the customer and never speak them out loud.\n' +
                '\n' +
                'NATURAL:\n' +
                '- Vary phrasing.\n' +
                "- Short acknowledgements: 'I understand', 'Got it'.\n" +
                '- When unclear: one question at a time.\n' +
                '\n' +
                'EMPATHY:\n' +
                '- Briefly acknowledge the situation.\n' +
                "- Transition: 'What I can offer...'",
        },
    };

    // STATIC-DEFAULT — system action descriptions per language. Always present.
    var SYSTEM_ACTION_DEFAULTS = {
        transfer_to_agent: {
            description: {
                NL: 'Verbindt door naar een medewerker. Gebruik bij: off-topic verzoeken, uitdrukkelijk verzoek om een medewerker, technische fout of aanhoudende onduidelijkheid. Zeg verder niets.',
                FR: "Transfère vers un collaborateur. Utiliser pour : demandes hors sujet, demande explicite d'un agent, erreur technique ou ambiguïté persistante. Ne rien dire de plus.",
                DE: 'Verbindet mit einem Mitarbeiter. Bei Off-Topic-Anfragen, ausdrücklichem Wunsch nach einem Menschen, technischem Fehler oder anhaltender Unklarheit. Nichts weiter sagen.',
                EN: 'Connect to a human agent. Use for off-topic requests, explicit request for a human, technical error, or persistent ambiguity. Say nothing more.',
            },
            confirmation_message: { NL: '', FR: '', DE: '', EN: '' },
            confirmation: 'None',
            entities: {},
            messages: {
                default: {
                    success: { NL: '', FR: '', DE: '', EN: '' },
                    failure: { NL: '', FR: '', DE: '', EN: '' },
                },
            },
        },
        escalate_to_agent: {
            description: {
                NL: 'Escaleert naar een medewerker. Gebruik aan het einde wanneer de klant niet tevreden is of meer hulp wil. Zeg niets voor of na het aanroepen van deze actie — de runtime spreekt messages.default.success uit.',
                FR: "Escalade vers un collaborateur. Utiliser à la fin lorsque le client n'est pas satisfait ou souhaite plus d'aide. Ne rien dire avant ou après l'appel de cette action — le runtime prononce messages.default.success.",
                DE: 'An einen Mitarbeiter eskalieren. Am Ende verwenden, wenn der Kunde unzufrieden ist oder mehr Hilfe möchte. Nichts sagen vor oder nach dem Aufrufen dieser Aktion — die Laufzeit spricht messages.default.success aus.',
                EN: 'Escalate to a human agent. Use at the end when the customer is not satisfied or wants more help. Do not speak before or after calling this action — the runtime speaks messages.default.success.',
            },
            confirmation_message: { NL: '', FR: '', DE: '', EN: '' },
            confirmation: 'None',
            entities: {},
            // Q9 / ADR-008 — messages.default.success is a one-line apology spoken by
            // the runtime when no scenario-level SAY precedes the escalation.
            messages: {
                default: {
                    success: {
                        NL: 'Mijn excuses voor het ongemak. Ik verbind u door met een collega.',
                        FR: 'Toutes mes excuses pour le désagrément. Je vous passe un collègue.',
                        DE: 'Entschuldigen Sie die Unannehmlichkeiten. Ich verbinde Sie mit einer Kollegin oder einem Kollegen.',
                        EN: 'I apologise for the inconvenience. Let me bring a colleague in.',
                    },
                    failure: { NL: '', FR: '', DE: '', EN: '' },
                },
            },
        },
        end_conversation: {
            description: {
                NL: 'Beindig het gesprek. Zeg niets voor of na het aanroepen van deze actie.',
                FR: "Termine la conversation. Ne rien dire avant ou après l'appel de cette action.",
                DE: 'Das Gespräch beenden. Nichts sagen vor oder nach dem Aufrufen dieser Aktion.',
                EN: 'End the conversation. Do not speak before or after calling this action.',
            },
            confirmation_message: { NL: '', FR: '', DE: '', EN: '' },
            confirmation: 'None',
            entities: {},
            messages: {
                default: {
                    success: { NL: '', FR: '', DE: '', EN: '' },
                    failure: { NL: '', FR: '', DE: '', EN: '' },
                },
            },
        },
    };

    // STATIC-DEFAULT — always-present fallback_error scenario per language.
    // DSL form: INFORM type, SAY for one-way speech, USE for the system action.
    // Translated speech content lives inside the SAY("...") argument; DSL verbs
    // and the transfer_to_agent parameter stay English per DSL convention.
    var FALLBACK_ERROR_SCENARIO = {
        objective: {
            NL: 'Objective: INFORM\nDoel: Handel een technische fout direct af.\n\n1. SAY "Sorry, er is een technisch probleem. Ik verbind u door."\n2. USE transfer_to_agent(disposition: "fallback_error")',
            FR: 'Objective: INFORM\nObjectif : Gérer immédiatement une erreur technique.\n\n1. SAY "Désolé, nous rencontrons un problème technique. Je vous transfère."\n2. USE transfer_to_agent(disposition: "fallback_error")',
            DE: 'Objective: INFORM\nZiel: Einen technischen Fehler sofort abwickeln.\n\n1. SAY "Entschuldigung, es gibt ein technisches Problem. Ich verbinde Sie weiter."\n2. USE transfer_to_agent(disposition: "fallback_error")',
            EN: 'Objective: INFORM\nGoal: Handle a technical error immediately.\n\n1. SAY "Sorry, we\'re experiencing a technical issue. I\'m transferring you."\n2. USE transfer_to_agent(disposition: "fallback_error")',
        },
        facts: { NL: [], FR: [], DE: [], EN: [] },
    };

    // ========================================================================
    // AGENT_PRIMARY — empty shells, populated by the assembler from the slot-map.
    // ========================================================================
    var AGENT_PRIMARY = {
        _meta: {
            version: '4.0',
            agentId: 'PRIMARY',
            projectName: projectName,
            primaryLanguage: primaryLanguage,
            languages: languages.slice(),
        },

        // STATIC-DEFAULT — written verbatim by assembler into every generated AGENT file
        llm: STATIC_LLM,
        labels: STATIC_LABELS,
        messages: STATIC_MESSAGES,

        // DYNAMIC slots — empty until slot-map overlay.
        persona: {},
        companyInfo: {},
        CANONICAL_RULES: [{ from: '_apiResult.caseNumber', to: 'case' }],
        fallback: { actions: ['transfer_to_agent'] },
        caseToOpening: {},
        caseToScenario: {},
        caseToActions: {},
        caseToKnowledge: {},
        scenarios: {},
        knowledgeModules: {},
        actions: {},
        cdbLogs: {},
    };

    // ========================================================================
    // AGENT_SECONDARY — empty shells; assembler only emits if slot-map has
    // agents.SECONDARY entry.
    // ========================================================================
    var AGENT_SECONDARY = {
        _meta: {
            version: '4.0',
            agentId: 'SECONDARY',
            projectName: projectName,
            primaryLanguage: primaryLanguage,
            languages: languages.slice(),
        },
        llm: STATIC_LLM,
        labels: STATIC_LABELS,
        messages: STATIC_MESSAGES,
        persona: {},
        companyInfo: {},
        CANONICAL_RULES: [{ from: '_apiResult.caseNumber', to: 'case' }],
        fallback: { actions: ['transfer_to_agent'] },
        caseToOpening: {},
        caseToScenario: {},
        caseToActions: {},
        caseToKnowledge: {},
        scenarios: {},
        knowledgeModules: {},
        actions: {},
        cdbLogs: {},
    };

    return {
        CONFIG: CONFIG,
        AGENT_PRIMARY: AGENT_PRIMARY,
        AGENT_SECONDARY: AGENT_SECONDARY,
        // Internal defaults exposed for the assembler (not part of the public
        // factory contract, but convenient to avoid duplication).
        _personaDefaults: PERSONA_DEFAULTS,
        _systemActionDefaults: SYSTEM_ACTION_DEFAULTS,
        _fallbackErrorScenario: FALLBACK_ERROR_SCENARIO,
    };
};
