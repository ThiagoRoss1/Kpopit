export default function CollectionStatus({ message }: { message: string }) {
    return (
        <div className="flex min-h-[calc(100dvh-48px)] sm:min-h-[calc(100dvh-60px)] items-center justify-center px-3">
            <p className="text-center text-[16px] font-bold text-white">{message}</p>
        </div>
    );
}
