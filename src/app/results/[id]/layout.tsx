import CandidateLayout from "@/app/(dashboard)/candidate/layout";

export default function ResultLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <CandidateLayout>{children}</CandidateLayout>;
}
