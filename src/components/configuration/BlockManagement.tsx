import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTipoCriterios, updateTipoCriterio } from '@/services/criteriaService';
import { TipoCriterio } from '@/types/evaluation';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

export function BlockManagement() {
  const [tiposCriterio, setTiposCriterio] = useState<TipoCriterio[]>([]);
  const [editedTipos, setEditedTipos] = useState<{ [key: number]: Partial<TipoCriterio> }>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchTiposCriterio = async () => {
      try {
        const data = await getTipoCriterios();
        setTiposCriterio(data);
      } catch (error) {
        console.error("Failed to fetch tipos de critério:", error);
        toast({ title: "Erro", description: "Não foi possível buscar os tipos de critério.", variant: "destructive" });
      }
    };
    fetchTiposCriterio();
  }, [toast]);

  const handleInputChange = (id: number, field: keyof TipoCriterio, value: string) => {
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value) || value === '') {
        setEditedTipos(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value as any },
        }));
    }
  };

  const saveTipoCriterio = async (id: number) => {
    const originalTipo = tiposCriterio.find(t => t.id === id);
    if (!originalTipo) return;

    const changes = editedTipos[id];
    if (!changes) return;

    const updatedTipoData = { ...originalTipo, ...changes };

    const updatedTipo: TipoCriterio = {
        ...updatedTipoData,
        valorNvl1: parseFloat(String(updatedTipoData.valorNvl1)) || 0,
        valorNvl2: parseFloat(String(updatedTipoData.valorNvl2)) || 0,
        valorNvl3: parseFloat(String(updatedTipoData.valorNvl3)) || 0,
        valorSpa: parseFloat(String(updatedTipoData.valorSpa)) || 0,
    } as TipoCriterio;

    try {
      await updateTipoCriterio(id, updatedTipo);
      setTiposCriterio(prev => prev.map(t => (t.id === id ? updatedTipo : t)));
      setEditedTipos(prev => {
        const newEdited = { ...prev };
        delete newEdited[id];
        return newEdited;
      });
      toast({ title: "Tipo de Critério atualizado", description: `${originalTipo.descricao} foi atualizado com sucesso.` });
    } catch (error) {
      console.error("Failed to update tipo de critério:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o tipo de critério.", variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle>Gerenciar Blocos de Critérios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="text-left p-4 font-semibold">Descrição</th>
                <th className="text-center p-4 font-semibold">Valor Nvl 1</th>
                <th className="text-center p-4 font-semibold">Valor Nvl 2</th>
                <th className="text-center p-4 font-semibold">Valor Nvl 3</th>
                <th className="text-center p-4 font-semibold">Valor SPA</th>
                <th className="text-center p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tiposCriterio.map((tipo) => {
                const edited = editedTipos[tipo.id] || {};
                const currentTipo = { ...tipo, ...edited };
                return (
                  <tr key={tipo.id} className="border-b">
                    <td className="p-4">{currentTipo.descricao}</td>
                    <td className="p-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={currentTipo.valorNvl1}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleInputChange(tipo.id, 'valorNvl1', e.target.value)}
                        className="w-24 text-center mx-auto"
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={currentTipo.valorNvl2}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleInputChange(tipo.id, 'valorNvl2', e.target.value)}
                        className="w-24 text-center mx-auto"
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={currentTipo.valorNvl3}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleInputChange(tipo.id, 'valorNvl3', e.target.value)}
                        className="w-24 text-center mx-auto"
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={currentTipo.valorSpa}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleInputChange(tipo.id, 'valorSpa', e.target.value)}
                        className="w-24 text-center mx-auto"
                      />
                    </td>
                    <td className="p-4 text-center">
                      {editedTipos[tipo.id] && (
                        <Button size="sm" onClick={() => saveTipoCriterio(tipo.id)}>
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
