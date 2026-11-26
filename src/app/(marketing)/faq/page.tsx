import { getI18n } from "@/i18n/server";
import { FaqList } from "@/components/marketing/faq";
export const metadata = { title: "FAQ" };
export default async function Faq() {
  const { t } = await getI18n();
  return <div className="container-x max-w-3xl py-16 sm:py-24"><h1 className="mb-8 text-4xl font-bold leading-[1.5]">{t.faq.title}</h1><FaqList t={t.faq} /></div>;
}
