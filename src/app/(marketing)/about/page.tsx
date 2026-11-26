import { getI18n } from "@/i18n/server";
import { ChanFlower } from "@/components/invitation/ornaments";
export const metadata = { title: "About" };
export default async function About() {
  const { locale } = await getI18n();
  const km = locale === "km";
  return (
    <div className="container-x max-w-3xl py-16 sm:py-24">
      <div className="text-gold"><ChanFlower size={48} /></div>
      <h1 className="mt-6 text-4xl font-bold leading-[1.5]">{km ? "អំពីធៀបអនឡាញ" : "About Theab Online"}</h1>
      <div className="mt-6 space-y-5 text-[17px] leading-9 text-ink-2">
        <p>{km ? "ធៀប គឺជាផ្នែកមួយនៃពិធីគ្រួសារខ្មែរ។ យើងបង្កើតវេទិកានេះ ដើម្បីឲ្យធៀបឌីជីថលនៅតែមានភាពថ្លៃថ្នូរ គោរព និងស្រស់ស្អាតតាមបែបខ្មែរ ខណៈពេលដែលការគ្រប់គ្រងភ្ញៀវកាន់តែងាយស្រួល។" : "The theab — the invitation — is part of every Khmer family ceremony. We built this platform so digital invitations can stay dignified, respectful and beautifully Khmer, while managing guests becomes effortless."}</p>
        <p>{km ? "ក្បាច់លម្អក្នុងគំរូរបស់យើង ត្រូវបានគូរឡើងវិញដោយផ្អែកលើសាលាក្បាច់ខ្មែរបុរាណ — ក្បាច់អង្គរ ភ្ញីទេស ភ្ញីវ័រ និងភ្ញីភ្លើង — មិនមែនចម្លងពីស្នាដៃនរណាម្នាក់ឡើយ។" : "The ornaments in our templates are drawn from scratch, inspired by the classical schools of kbach — Angkor, phni tes, phni voa and phni pleung — rather than copied from anyone's artwork."}</p>
      </div>
    </div>
  );
}
