import { StreamSource } from '@/types';

// Legal & Open Source Media Streams and sample test swarms
export const OPEN_SOURCE_STREAMS: Record<string | number, StreamSource[]> = {
  // Cosmos Laundromat
  '823464': [
    {
      id: 'src-cosmos-1080p',
      name: 'Cosmos Laundromat (1080p WebM/MP4)',
      title: 'Cosmos.Laundromat.2015.1080p.Blender.OpenMovie',
      magnet: 'magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056&dn=Cosmos+Laundromat&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com',
      quality: '1080p',
      size: '210 MB',
      seeds: 42,
      peers: 15,
      provider: 'Blender Foundation Open Torrent',
      type: 'torrent',
    },
    {
      id: 'src-cosmos-direct',
      name: 'Cosmos Laundromat (Internet Archive MP4)',
      title: 'Cosmos Laundromat Direct Fast Stream',
      url: 'https://archive.org/download/cosmos-laundromat-first-cycle/Cosmos%20Laundromat%20-%20First%20Cycle.mp4',
      quality: '720p',
      size: '204 MB',
      provider: 'Internet Archive',
      type: 'direct',
    }
  ],
  // Big Buck Bunny
  '101': [
    {
      id: 'src-bbb-torrent',
      name: 'Big Buck Bunny (1080p H.264)',
      title: 'Big.Buck.Bunny.1080p.surround.mp4',
      magnet: 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337',
      quality: '1080p',
      size: '276 MB',
      seeds: 85,
      peers: 28,
      provider: 'Blender Foundation Torrent Swarm',
      type: 'torrent',
    },
    {
      id: 'src-bbb-direct',
      name: 'Direct MP4 Stream',
      title: 'Big Buck Bunny Direct Stream',
      url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
      quality: '720p',
      size: '59 MB',
      provider: 'Internet Archive',
      type: 'direct',
    }
  ],
  // Tears of Steel
  '102': [
    {
      id: 'src-tos-torrent',
      name: 'Tears of Steel (1080p VFX)',
      title: 'Tears.of.Steel.2012.1080p.mkv',
      magnet: 'magnet:?xt=urn:btih:209c310cd6b191af46b911a474694077f09a5390&dn=Tears+of+Steel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337',
      quality: '1080p',
      size: '560 MB',
      seeds: 34,
      peers: 12,
      provider: 'Open VFX Foundation Swarm',
      type: 'torrent',
    },
    {
      id: 'src-tos-direct',
      name: 'Direct MP4 Stream',
      title: 'Tears of Steel Direct Stream',
      url: 'https://archive.org/download/tearsofsteelblendervfxopenmovie800p/Tears%20of%20Steel%20-%20Blender%20VFX%20Open%20Movie%20800p.mp4',
      quality: '720p',
      size: '236 MB',
      provider: 'Internet Archive',
      type: 'direct',
    }
  ],
  // Sintel
  '103': [
    {
      id: 'src-sintel-torrent',
      name: 'Sintel (4K & 1080p)',
      title: 'Sintel.2010.1080p.mkv',
      magnet: 'magnet:?xt=urn:btih:08a806048a1da9843640d71478377e6d44acb0f8&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337',
      quality: '1080p',
      size: '650 MB',
      seeds: 61,
      peers: 19,
      provider: 'Blender Foundation Torrent Swarm',
      type: 'torrent',
    },
    {
      id: 'src-sintel-direct',
      name: 'Direct MP4 Stream',
      title: 'Sintel Direct Stream',
      url: 'https://archive.org/download/Sintel/sintel-2048-surround.mp4',
      quality: '1080p',
      size: '296 MB',
      provider: 'Internet Archive',
      type: 'direct',
    }
  ],
};

export function getStreamsForMedia(mediaId: string | number): StreamSource[] {
  const key = String(mediaId);
  return OPEN_SOURCE_STREAMS[key] || [];
}
