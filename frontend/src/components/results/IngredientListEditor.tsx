"use client";

import { useSimulationStore } from "@/lib/simulation/useSimulationStore";
import { createUserIngredient } from "@/lib/simulation/deriveIngredientProvenance";
import IngredientSimulationRow from "./IngredientSimulationRow";
import AddIngredientControl from "./AddIngredientControl";

export default function IngredientListEditor() {
  const ingredients = useSimulationStore((s) => s.ingredients);
  const toggleIngredient = useSimulationStore((s) => s.toggleIngredient);
  const removeIngredient = useSimulationStore((s) => s.removeIngredient);
  const addIngredient = useSimulationStore((s) => s.addIngredient);

  const handleAdd = (name: string) => {
    addIngredient(createUserIngredient(name));
  };

  return (
    <div className="space-y-2">
      {ingredients.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          No ingredients to simulate. Add one below.
        </p>
      )}

      {ingredients.map((ing) => (
        <IngredientSimulationRow
          key={ing.id}
          ingredient={ing}
          onToggle={() => toggleIngredient(ing.id)}
          onRemove={() => removeIngredient(ing.id)}
        />
      ))}

      <AddIngredientControl onAdd={handleAdd} />
    </div>
  );
}
