import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvaluationPanel } from '../evaluation/EvaluationPanel';
import { ConfigurationPanel } from '../configuration/ConfigurationPanel';
import { ReportsPanel } from '../reports/ReportsPanel';
import { BarChart3, Settings, Users } from 'lucide-react';

export function NavigationTabs() {
  return (
    <Tabs defaultValue="evaluation" className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mx-auto mb-8">
        <TabsTrigger value="evaluation" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Avaliação</span>
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Relatórios</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configurações</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="evaluation" className="space-y-6">
        <EvaluationPanel />
      </TabsContent>

      <TabsContent value="reports" className="space-y-6">
        <ReportsPanel />
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
        <ConfigurationPanel />
      </TabsContent>
    </Tabs>
  );
}