import PageShell from "../../components/PageShell/PageShell";
import { PressLink } from "../../components/buttons/PressButton";
import PageMeta from "../../components/Seo/PageMeta";

/** Placeholder page: the shell, the title and "Coming soon...". Never indexed. */
export default function ComingSoon({ title, path }: { title: string; path: string }) {
    return (
        <>
            <PageMeta title={`${title} | KpopIt`} description={`${title} is coming soon to KpopIt.`} path={path} noindex />
            <PageShell header={{ title, subtitle: "Coming soon..." }}>
                <div className="flex justify-center mt-8">
                    <PressLink to="/" variant="chip" size="lg">Back to the games</PressLink>
                </div>
            </PageShell>
        </>
    );
}
