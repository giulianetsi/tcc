import React, { useState, useEffect } from 'react';
import './IosInstallHint.css';

const isIOS = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  // Basic iOS detection (iPhone/iPad/iPod)
  const isiOSUA = /iP(hone|od|ad)/.test(ua);
  // iPadOS 13+ can report as MacIntel; detect touch-capable Mac as iPad
  const isIpadDesktop = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  // Explicit Android exclusion
  const isAndroid = /Android/.test(ua);
  return (isiOSUA || isIpadDesktop) && !isAndroid;
};

const IosInstallHint = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!isIOS()) return;
      const dismissed = localStorage.getItem('ios_install_hint_dismissed');
      if (!dismissed) setVisible(true);
    } catch (e) {
      // ignore
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('ios_install_hint_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="ios-install-hint" role="dialog" aria-live="polite">
      <div className="ios-install-content">
        <strong>Instalar na Tela Inicial</strong>
        <p>Para adicionar este site como um app no iOS, abra no Safari e toque em <em>Compartilhar → Adicionar à Tela de Início</em>.</p>
        <button className="ios-install-dismiss" onClick={dismiss}>Fechar</button>
      </div>
    </div>
  );
};

export default IosInstallHint;
