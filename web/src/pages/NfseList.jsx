
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function NfseList() {
    // For MVP, we fetch all notes or select a company first. 
    // To keep it simple, let's assume we fetch for the first active company or just list all if endpoint supports it.
    // The current endpoint is /companies/:id/nfs. 
    // We should probably select a company. For now, I'll create a placeholder that asks to select a company in future, 
    // or lists for the first company found.

    // Better approach: Since we don't have a specific global NFS endpoint yet, 
    // I will show a simple message or fetch for the first company.

    return (
        <div className="text-center py-20">
            <div className="bg-slate-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <FileText className="text-slate-400" size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Visualização de Notas</h2>
            <p className="text-slate-500 max-w-md mx-auto">
                Selecione uma empresa na aba "Empresas" para ver suas notas fiscais detalhadas.
                (Funcionalidade de listagem global em desenvolvimento na Fase 5)
            </p>
        </div>
    );
}
