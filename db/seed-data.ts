import type { Exercise } from "@/lib/tilly/types";

// Startbestand der Uebungsbibliothek. Wird einmalig per `npm run db:seed` in den
// kv_store geschrieben (Key "exercises") - kein Runtime-Merge mehr im Client.
export const SEED_EXERCISES: Array<Omit<Exercise, "id" | "masteryLevel">> = [
  {
    name: "Ran",
    verbalCommand: "",
    handSignal: "Rechte Hand auf den Oberschenkel legen.",
    goal: "Tilly setzt sich rechts neben dich, nah am Bein, und schaut nach oben zu dir.",
    notes: "",
  },
  {
    name: "Sitz",
    verbalCommand: "Sitz",
    handSignal: "Flache Hand mit Handfläche nach oben langsam vom Boden nach oben führen.",
    goal: "Tilly setzt sich vor oder neben dich.",
    notes: "1. Leckerli über die Nase nach hinten oben führen, bis sie sich von selbst setzt.\n2. Kommando erst sagen, wenn sie sich setzt.\n3. Handbewegung nach und nach kleiner machen.",
  },
  {
    name: "Platz",
    verbalCommand: "Platz",
    handSignal: "Flache Hand mit Handfläche nach unten vom Bauch Richtung Boden führen.",
    goal: "Tilly legt sich mit Bauch und Ellbogen auf dem Boden ab.",
    notes: "1. Aus dem Sitz heraus üben.\n2. Leckerli langsam vom Näschen zum Boden führen.\n3. Erst belohnen, wenn die Ellbogen den Boden berühren.",
  },
  {
    name: "Bleib",
    verbalCommand: "Bleib",
    handSignal: "Flache Hand wie ein Stoppschild vor ihre Nase halten.",
    goal: "Tilly bleibt in Position (Sitz oder Platz), bis sie erlöst wird.",
    notes: "1. Erst nur 1–2 Sekunden Abstand halten, dann belohnen.\n2. Abstand und Zeit langsam steigern.\n3. Immer mit einem festen Erlösungswort beenden (z. B. „Okay“).",
  },
  {
    name: "Hier",
    verbalCommand: "Hier",
    handSignal: "Beide Arme seitlich ausbreiten und Richtung Körper führen.",
    goal: "Tilly kommt direkt zu dir und setzt sich vor dich.",
    notes: "1. Erst auf kurze Distanz ohne Ablenkung üben.\n2. Immer freudig und mit Belohnung empfangen, nie zum Schimpfen rufen.\n3. Distanz und Ablenkung langsam steigern.",
  },
  {
    name: "Fuß",
    verbalCommand: "Fuß",
    handSignal: "Linke Hand locker an der linken Hosennaht halten.",
    goal: "Tilly läuft entspannt auf Hüfthöhe links neben dir, ohne zu ziehen.",
    notes: "1. Erst im Stand üben, dann einzelne Schritte.\n2. Bei lockerer Leine sofort belohnen.\n3. Schrittzahl langsam steigern.",
  },
  {
    name: "Aus",
    verbalCommand: "Aus",
    handSignal: "Flache Hand mit Handfläche nach oben unter die Schnauze halten.",
    goal: "Tilly lässt einen Gegenstand aus dem Fang fallen.",
    notes: "1. Gegenstand gegen ein Leckerli tauschen, nicht wegreißen.\n2. Kommando erst sagen, wenn sie loslässt.\n3. Später den Tausch nur noch zufällig belohnen, nicht jedes Mal.",
  },
  {
    name: "Pfote",
    verbalCommand: "Pfote",
    handSignal: "Offene Hand mit der Handfläche nach oben knapp über dem Boden vor die Pfote halten.",
    goal: "Tilly legt eine Vorderpfote in deine Hand.",
    notes: "1. Aus dem Sitz heraus üben.\n2. Leichte Berührung an der Pfote abwarten und sofort belohnen.\n3. Nach und nach die volle Pfotenbewegung in die Hand abwarten.",
  },
  {
    name: "Klick für Blick",
    verbalCommand: "",
    handSignal: "Kein festes Handzeichen – reagiere auf jeden freiwilligen Blickkontakt.",
    goal: "Tilly schaut dir von sich aus in die Augen, auch bei Ablenkung.",
    notes: "1. Jeden zufälligen Blick zu dir sofort markieren (Klicker oder Wort) und belohnen.\n2. Schrittweise leichte Ablenkungen einbauen.\n3. Dauer des Blickkontakts langsam steigern, bevor belohnt wird.",
  },
  {
    name: "Touch",
    verbalCommand: "Touch",
    handSignal: "Flache Hand mit der Handfläche seitlich vor die Nase halten.",
    goal: "Tilly berührt deine Handfläche mit der Nase.",
    notes: "1. Hand nah an die Nase halten, jede Berührung belohnen.\n2. Abstand zur Hand langsam vergrößern.\n3. Später die Hand an verschiedene Positionen halten (hoch, tief, zur Seite).",
  },
  {
    name: "321 Übung",
    verbalCommand: "1, 2, 3",
    handSignal: "Kein festes Handzeichen – die Übung läuft über eine gleichmäßige Zählstimme, nicht über Gesten.",
    goal: "Tilly lernt: Auf die Zahl „3“ folgt zuverlässig ein Leckerli. Das gibt ihr Sicherheit und lenkt ihre Aufmerksamkeit entspannt auf dich statt auf Ablenkungen.",
    notes: "1. Nur „3“ sagen und sofort ein Leckerli geben. Mehrmals wiederholen.\n2. Zu „2, 3“ übergehen – das Leckerli gibt es weiterhin genau bei „3“.\n3. Zu „1, 2, 3“ übergehen – auch hier nur bei „3“ belohnen.\n4. Klappt das sicher, beim Zählen ein paar Schritte gehen und erst bei „3“ anhalten und belohnen – so kommt Bewegung rein.\n5. Später auch bei leichter Ablenkung einsetzen, um Tilly zu fokussieren.\n\nBasiert auf dem „1-2-3 Pattern Game“ von Leslie McDevitt (Control Unleashed).",
  },
  {
    name: "Geschirr & Halsband anlegen",
    verbalCommand: "",
    handSignal: "Kein festes Handzeichen – die Übung läuft über Gewöhnung in Minischritten, da Tilly hier großes Meideverhalten zeigt.",
    goal: "Tilly lässt sich Geschirr und Halsband entspannt anlegen, ohne wegzulaufen oder auszuweichen.",
    notes: "1. Geschirr/Halsband einfach in der Nähe liegen lassen (z. B. beim Füttern oder Spielen), ohne jede Interaktion – Tilly darf es in ihrem Tempo beschnuppern.\n2. Freiwilliges Interesse oder Annähern sofort belohnen.\n3. Geschirr kurz an sie heranhalten, ohne es anzulegen – bei entspanntem Verhalten belohnen, dann wieder wegnehmen.\n4. Geschirr ganz kurz auf den Rücken legen (nicht schließen), sofort wieder abnehmen + belohnen.\n5. Dauer in winzigen Schritten steigern, erst danach schließen/richtig anlegen.\n6. Halsband separat nach demselben Schema üben.\n7. Bei Anzeichen von Stress (Ducken, Weglaufen, Anspannung) einen Schritt zurückgehen – nie über Widerstand hinweg anlegen, lieber öfter kurz und entspannt üben als einmal lang und stressig.",
  },
  {
    name: "Down",
    verbalCommand: "Down",
    handSignal: "Zeigefinger auf den Boden richten, genau dort, wo Tilly ihre Schnauze hinlegen soll.",
    goal: "Tilly legt sich ganz flach hin, Schnauze auf dem Boden am Zeigefinger – langfristig auch im Stehen, wenn der Finger von oben nach unten zeigt.",
    notes: "1. Im Sitzen oder Knien anfangen: Zeigefinger auf den Boden legen, Leckerli darunter/davor halten, abwarten, bis Tilly sich mit der Schnauze ganz zum Finger runterlegt (flach, nicht nur Platz).\n2. Kommando „Down“ erst sagen, wenn sie in Position ist, dann sofort belohnen.\n3. Finger nur ein kleines Stück vom Boden abheben (z. B. 1–2 cm), gleiches Verhalten abwarten und belohnen.\n4. Abstand des Fingers vom Boden nach und nach weiter vergrößern.\n5. Irgendwann im Stehen üben: Finger von oben senkrecht nach unten zeigen lassen.\n6. Ziel erreicht, wenn im Stehen nach unten zeigen allein als Signal reicht.",
  },
];
