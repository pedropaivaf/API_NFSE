
import { X, AlertCircle } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", type = "info" }) {
    if (!isOpen) return null;

    const colors = {
        info: "bg-brand-600 hover:bg-brand-700 ring-brand-700 shadow-brand-200",
        danger: "bg-red-600 hover:bg-red-700 ring-red-700 shadow-red-200",
        warning: "bg-amber-600 hover:bg-amber-700 ring-amber-700 shadow-amber-200"
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Modal Content */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="px-6 pt-6 pb-2 flex justify-between items-start">
                    <div className={`p-2 rounded-lg ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
                        <AlertCircle size={24} />
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="px-6 pb-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-600 leading-relaxed">{message}</p>
                </div>

                <div className="bg-slate-50 p-6 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-5 py-2.5 text-white font-bold rounded-xl transition shadow-lg ring-2 ${colors[type] || colors.info}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
