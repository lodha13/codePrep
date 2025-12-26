import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { Language } from "@/types/schema";

let languagesCache: Language[] | null = null;

export async function getLanguages(): Promise<Language[]> {
    if (languagesCache) {
        return languagesCache;
    }
    const languagesSnapshot = await getDocs(collection(db, "languages"));
    const languagesList = languagesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Language));
    languagesCache = languagesList;
    return languagesList;
}

export async function getLanguageId(languageName: string): Promise<number | null> {
    const languages = await getLanguages();
    const language = languages.find(lang => lang.id === languageName);
    return language ? language.judge0Id : null;
}