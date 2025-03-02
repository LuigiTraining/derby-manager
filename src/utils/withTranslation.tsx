import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Higher-Order Component (HOC) che fornisce funzionalità di traduzione ai componenti.
 *
 * @param Component - Il componente da avvolgere con le funzionalità di traduzione
 * @returns Un nuovo componente con le funzionalità di traduzione
 */
export const withTranslation = <P extends object>(
  Component: React.ComponentType<P & { t: (key: string) => string; i18n: any }>
) => {
  return (props: P) => {
    const { t, i18n } = useTranslation();

    return <Component {...props} t={t} i18n={i18n} />;
  };
};

export default withTranslation;
