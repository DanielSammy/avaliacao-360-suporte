import React from 'react';

export function AppFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t bg-gradient-primary text-primary-foreground z-50">
      <div className="container py-3 flex items-center justify-between">
  <div className="text-sm">© {new Date().getFullYear()} Space Sistemas</div>
        <div className="text-sm text-muted-foreground">Sistema de Avaliação de Desempenho</div>
      </div>
    </footer>
  );
}

export default AppFooter;
