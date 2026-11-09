import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import PortraitHall from '../components/portrait-hall'
import { members } from '../data/members'

export default function Home() {
  const images = new Set(readdirSync(join(process.cwd(), 'public/light-cones'), { withFileTypes: true })
    .filter((entry) => entry.isFile()).map((entry) => entry.name))
  const publishedLightCones = Object.fromEntries(members.flatMap(({ memberId }) => {
    const file = `${memberId}.webp`
    return images.has(file) ? [[memberId, `/light-cones/${file}`]] : []
  }))

  return <PortraitHall publishedLightCones={publishedLightCones} />
}
