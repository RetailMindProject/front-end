interface Props { icon: string; text: string; }
export default function FeatureItem({ icon, text }: Props) {
  return (
    <div className="flex items-center gap-6">
      <span className="text-2xl">{icon}</span>
      <span className="text-gray-700">{text}</span>
    </div>
  );
}
