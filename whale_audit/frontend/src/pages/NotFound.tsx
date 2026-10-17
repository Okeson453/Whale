import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, Button } from '../components/ui';
import { AlertCircle, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-cyan-400 mx-auto flex items-center justify-center border border-slate-700">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">404 - Page Not Found</h1>
            <p className="text-xs text-slate-400 mt-1">
              The requested surveillance route does not exist.
            </p>
          </div>
          <Link to="/">
            <Button variant="primary" size="sm">
              <Home className="w-4 h-4 mr-1" /> Return to Intelligence Overview
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
