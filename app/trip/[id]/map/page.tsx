import MapView from '@/components/map/MapView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MapPage({ params }: PageProps) {
  const { id } = await params;
  return <MapView tripId={id} />;
}
