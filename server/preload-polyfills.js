/**
 * POLYFILLS PARA O NODE 18 INTERNO DO ELECTRON
 * Este arquivo é carregado ANTES de qualquer módulo via --require (execArgv)
 * no fork do main.cjs do Electron.
 *
 * O problema: Electron 28 embarca Node v18.18.2, que NÃO possui global.File.
 * O módulo "undici" (dependência interna do @supabase/supabase-js) tenta
 * usar `File` globalmente na linha de inicialização do módulo (load-time),
 * causando "ReferenceError: File is not defined" e crashando o servidor.
 *
 * A solução: Definir global.File (e outros globais faltantes) ANTES
 * de qualquer require() ser executado.
 */

'use strict';

// Polyfill: global.File
if (typeof globalThis.File === 'undefined') {
    const { Blob } = require('buffer');
    globalThis.File = class File extends Blob {
        #name;
        #lastModified;
        constructor(fileBits, fileName, options = {}) {
            super(fileBits, options);
            this.#name = fileName;
            this.#lastModified = options.lastModified || Date.now();
        }
        get name() {
            return this.#name;
        }
        get lastModified() {
            return this.#lastModified;
        }
    };
}

// Polyfill: global.FormData (caso undici precise)
if (typeof globalThis.FormData === 'undefined') {
    try {
        const undiciFormData = require('undici').FormData;
        if (undiciFormData) {
            globalThis.FormData = undiciFormData;
        }
    } catch (e) {
        // Se undici não exportar FormData, não tem problema
    }
}
