import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperatorManagement } from './OperatorManagement';
import { CriteriaManagement } from './CriteriaManagement';
import { SystemSettings } from './SystemSettings';
import { Users, Target, Wrench } from 'lucide-react';

export function ConfigurationPanel() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">Configurações do Sistema</h2>
        <p className="text-muted-foreground">Gerencie operadores, critérios e configurações gerais</p>
      </div>

      <Tabs defaultValue="operators" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mx-auto">
          <TabsTrigger value="operators" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Operadores</span>
          </TabsTrigger>
          <TabsTrigger value="criteria" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Critérios</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Sistema</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operators" className="space-y-6">
          <OperatorManagement />
        </TabsContent>

        <TabsContent value="criteria" className="space-y-6">
          <CriteriaManagement />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}