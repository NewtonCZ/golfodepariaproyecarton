import React from 'react';
import { Mail, Phone, MapPin, FileText, Cookie, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 mt-12">
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Empresa */}
          <div>
            <h3 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-2">
              Grupo Agro Cajigal, S.A.
            </h3>
            <ul className="space-y-1.5 text-[10px] text-slate-500 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                <span>RIF: J-50769027-0</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Av. Sucre de Yaguaraparo, Local Nro. S/N,
                  Zona Yaguaraparo, Yaguaraparo, Sucre, Zona 6155
                </span>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-2">
              Contacto
            </h3>
            <ul className="space-y-1.5 text-[10px] text-slate-500">
              <li className="flex items-center gap-1.5">
                <Mail className="w-3 h-3 shrink-0" />
                <a href="mailto:grupoagrocajigalsa@gmail.com" className="hover:text-amber-400 transition-colors">
                  grupoagrocajigalsa@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 shrink-0" />
                <a href="tel:+584245156225" className="hover:text-amber-400 transition-colors">
                  0424-5156225
                </a>
              </li>
            </ul>
          </div>

          {/* Enlaces legales */}
          <div>
            <h3 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-2">
              Legal
            </h3>
            <ul className="space-y-1.5 text-[10px] text-slate-500">
              <li>
                <a href="/terminos" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                  <FileText className="w-3 h-3" />
                  <span>Términos y Condiciones</span>
                </a>
              </li>
              <li>
                <a href="/privacidad" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                  <Shield className="w-3 h-3" />
                  <span>Política de Privacidad</span>
                </a>
              </li>
              <li>
                <a href="/politica-cookies" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                  <Cookie className="w-3 h-3" />
                  <span>Política de Cookies</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-5 pt-4 border-t border-slate-900 text-center">
          <p className="text-[9px] text-slate-600 leading-relaxed">
            © {new Date().getFullYear()} Grupo Agro Cajigal, S.A. Todos los derechos reservados.
          </p>
          <p className="text-[9px] text-slate-700 mt-0.5">
            Número de autorización CONALOT: [PENDIENTE]
          </p>
        </div>
      </div>
    </footer>
  );
};
