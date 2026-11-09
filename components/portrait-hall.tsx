'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { members } from '../data/members'
import type { Member } from '../data/members'

const icons = {
  search: 'M10.5 16a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Zm4-1.5 4 4',
  close: 'm6 6 12 12M18 6 6 18',
  arrow: 'M5 12h13m-5-5 5 5-5 5',
  reset: 'M5 9V5m0 4h4m-4 0a7 7 0 1 1 .1 6',
  frame: 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5',
  star: 'M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z',
}

function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name]} />
    </svg>
  )
}

function portraitStyle(member: Member) {
  const { position, mobilePosition } = member
  return {
    '--x': `${position.x}%`,
    '--y': `${position.y}%`,
    '--scale': position.scale,
    '--layer': position.layer,
    '--mobile-x': `${mobilePosition.x}%`,
    '--mobile-y': `${mobilePosition.y}%`,
    '--mobile-scale': mobilePosition.scale,
    '--mobile-layer': mobilePosition.layer,
  } as CSSProperties
}

function findLinkedMember(value: string | null) {
  const target = value?.normalize('NFKC').trim()
  if (!target) return
  const number = /^\d+$/.test(target) ? target.padStart(3, '0') : target
  return members.find((member) => member.memberNumber === number || member.nickname === target)
}

function findLegacyLinkedMember(hash: string) {
  return /^#\d+$/.test(hash) ? findLinkedMember(hash.slice(1)) : undefined
}

function syncMemberLink(memberNumber?: string) {
  const url = new URL(window.location.href)
  if (memberNumber) url.searchParams.set('member', memberNumber)
  else url.searchParams.delete('member')
  if (findLegacyLinkedMember(url.hash)) url.hash = ''
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
}

function Profile({ member, onClose }: { member: Member; onClose: () => void }) {
  const details = member.profile
  const memories = details ? details.memory.split(/[，,、]\s*/).filter(Boolean) : []
  return (
    <aside
      id="member-profile"
      className="profile"
      aria-labelledby="profile-name"
    >
      <div className="profile-top">
        <span className="profile-masthead"><Icon name="star" /> MY PROFILE <Icon name="star" /></span>
        <button className="icon-button" type="button" aria-label="关闭个人名片" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="profile-identity">
        <div>
          <span className="profile-kicker micro">人物档案 <span className="profile-index">/ {member.memberNumber}</span></span>
          <h2 id="profile-name">{member.nickname}</h2>
          <p className="profile-group">北辰青年 · 第六组</p>
        </div>
        <div className="profile-avatar" style={{ '--accent': member.accent } as CSSProperties}>
          <img src={member.profileAvatar} alt={`${member.nickname}的头像`} />
        </div>
      </div>
      {details && (
        <div className="profile-details">
          {details.trait && (
            <section className="profile-section">
              <h3><Icon name="star" /> 个人特质</h3>
              <p>{details.trait}</p>
            </section>
          )}
          {details.value && (
            <section className="profile-section">
              <h3><Icon name="star" /> 团队价值</h3>
              <p>{details.value}</p>
            </section>
          )}
          {memories.length > 0 && (
            <section className="profile-section profile-memory">
              <h3><Icon name="star" /> 别人记住我</h3>
              <ul className="profile-chips">{memories.map((tag, index) => <li key={index}>{tag}</li>)}</ul>
            </section>
          )}
        </div>
      )}
      {!member.lightCone && <p className="profile-light-cone"><Icon name="star" /> 光锥 · 待收录</p>}
    </aside>
  )
}

function MemberDossier({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <div id="member-dossier" className={member.lightCone ? 'dossier dossier-paired' : 'dossier'}>
      {member.lightCone && (
        <section className="light-cone" aria-labelledby="light-cone-title">
          <div className="light-cone-heading">
            <h2 id="light-cone-title"><Icon name="star" /> 光锥 <span>LIGHT CONE</span></h2>
            <span className="micro">NO. {member.memberNumber}</span>
          </div>
          <iframe
            className="light-cone-viewer"
            src={member.lightCone.viewer}
            title={`${member.nickname}的光锥 · ${member.lightCone.title}`}
            onLoad={(event) => {
              event.currentTarget.contentDocument?.addEventListener('keydown', (key) => {
                if (key.key === 'Escape') onClose()
              })
            }}
          />
        </section>
      )}
      <Profile member={member} onClose={onClose} />
    </div>
  )
}

export default function PortraitHall() {
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const deepLinkDone = useRef(false)
  const selected = members.find((member) => member.memberId === selectedId)
  const term = query.normalize('NFKC').trim().toLowerCase().replace(/^#\s*/, '')
  const matches = term ? members.filter(({ memberNumber, nickname }) =>
    memberNumber.includes(term) || nickname.toLowerCase().includes(term) ||
    (/^\d+$/.test(term) && Number(memberNumber) === Number(term)),
  ) : []

  function clearSelection() {
    setSelectedId(null)
    syncMemberLink()
  }

  function reset() {
    setQuery('')
    setShowResults(false)
    clearSelection()
  }

  function closeProfile() {
    const activePortrait = stageRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
    clearSelection()
    activePortrait?.focus({ preventScroll: true })
    if (selected?.lightCone) stageRef.current?.scrollIntoView({ block: 'start' })
  }

  function selectMember(memberId: string, fromSearch = false) {
    const member = members.find((entry) => entry.memberId === memberId)
    if (!member) return
    setSelectedId(memberId)
    setShowResults(false)
    syncMemberLink(member.memberNumber)
    const stage = stageRef.current
    const portrait = stage?.querySelector<HTMLButtonElement>(`[data-member-id="${memberId}"]`)
    if (fromSearch) {
      searchRef.current?.blur()
      portrait?.focus({ preventScroll: true })
    }
    const compact = window.matchMedia('(max-width: 900px)').matches
    if (stage && portrait && (member.lightCone || compact || fromSearch)) {
      // Wait for the profile and its mobile scroll space to enter the layout.
      requestAnimationFrame(() => {
        if (portrait.getAttribute('aria-pressed') !== 'true') return
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        if (member.lightCone) {
          document.getElementById('member-dossier')?.scrollIntoView({ block: 'start', behavior })
        } else if (compact) {
          const profile = document.getElementById('member-profile')
          const stageTop = stage.getBoundingClientRect().top
          const figure = portrait.getBoundingClientRect()
          const faceBottom = figure.top + figure.height * 0.56
          const panelTop = profile?.getBoundingClientRect().top ?? window.innerHeight
          window.scrollBy({ top: Math.max(stageTop - 10, faceBottom - panelTop + 22), behavior })
        } else {
          portrait.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior })
        }
      })
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (matches.length) selectMember(matches[0].memberId, true)
    else setShowResults(true)
  }

  useEffect(() => {
    function handleOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !searchRef.current?.form?.contains(event.target)) setShowResults(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (showResults && term) setShowResults(false)
      else if (selectedId) closeProfile()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedId, showResults, term])

  // Old numeric fragments open a profile and are converted to the shareable query URL.
  useEffect(() => {
    if (deepLinkDone.current) return
    deepLinkDone.current = true
    const url = new URL(window.location.href)
    const found = findLinkedMember(url.searchParams.get('member')) ?? findLegacyLinkedMember(url.hash)
    if (found) selectMember(found.memberId, true)
  }, [])

  return (
    <>
      <header className="site-header">
        <div className="site-bar">
          <div className="brand">
            <img src="/archive-mark.svg" alt="" width="38" height="38" />
            <div><strong>群像纪念册</strong><span className="micro">GROUP PORTRAIT ARCHIVE</span></div>
          </div>
          <span className="edition micro"><span /> 第六组群像 <b>06</b></span>
        </div>
      </header>

      <main className={`hall${selected ? ' has-selection' : ''}${selected?.lightCone ? ' has-light-cone' : ''}`}>
        <div className="intro">
          <div>
            <div className="chapter micro"><Icon name="star" /> VOL. 01 <span /> THE GROUP PORTRAIT</div>
            <h1>日光留影</h1>
            <p>把相遇的人，留在同一张合照里。</p>
          </div>
          <form
            role="search"
            className="search"
            onSubmit={submitSearch}
            onBlur={(event) => {
              if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setShowResults(false)
            }}
          >
            <label htmlFor="member-search" className="search-label">寻找人物</label>
            <div className="search-field">
              <Icon name="search" />
              <input
                ref={searchRef}
                id="member-search"
                autoComplete="off"
                placeholder="输入编号或查找名称"
                value={query}
                onFocus={() => setShowResults(true)}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setShowResults(true)
                  if (!event.target.value.trim()) clearSelection()
                }}
              />
              {query && <button type="button" className="icon-button" aria-label="清空搜索" onClick={() => { reset(); searchRef.current?.focus() }}><Icon name="close" /></button>}
              <button type="submit" className="search-submit icon-button" aria-label="搜索人物"><Icon name="arrow" /></button>
            </div>
            {showResults && term && (
              <div className="search-results">
                <p className="results-caption" role="status">
                  {matches.length ? `找到 ${matches.length} 位伙伴` : '没有找到人物，试试「001」或「稳稳子」。'}
                </p>
                {matches.length > 0 && (
                  <ul>
                    {matches.map((member) => (
                      <li key={member.memberId}>
                        <button type="button" onClick={() => selectMember(member.memberId, true)}>
                          <span className="result-swatch" style={{ background: member.accent }} />
                          <span className="result-number micro">#{member.memberNumber}</span>
                          <strong>{member.nickname}</strong>
                          <Icon name="arrow" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>
        </div>

        <section className="workspace" aria-labelledby="stage-title">
          <div className="stage" ref={stageRef} onClick={(event) => { if (event.target === event.currentTarget) clearSelection() }}>
            <div className="stage-heading">
              <span className="stage-title"><Icon name="frame" /><span id="stage-title">合影大厅</span></span>
              <span className="stage-count micro">FRAME 01 <i /> {String(members.length).padStart(2, '0')} PORTRAITS</span>
            </div>
            <div className="stage-inscription micro">A LITTLE<br />LIGHT TO<br />KEEP.</div>
            <div className="stage-corner stage-corner-left" aria-hidden="true" />
            <div className="stage-corner stage-corner-right" aria-hidden="true" />
            {members.map((member) => {
              const active = selectedId === member.memberId
              return (
                <button
                  type="button"
                  className={`portrait${selected && !active ? ' portrait-muted' : ''}`}
                  style={portraitStyle(member)}
                  key={member.memberId}
                  data-member-id={member.memberId}
                  aria-label={`${member.memberNumber} ${member.nickname}`}
                  aria-pressed={active}
                  aria-controls={active ? 'member-profile' : undefined}
                  onClick={() => selectMember(member.memberId)}
                >
                  <img src={member.avatar} alt="" draggable={false} />
                </button>
              )
            })}
          </div>
          {selected && <MemberDossier key={selected.memberId} member={selected} onClose={closeProfile} />}
        </section>

        <div className="stage-toolbar">
          <p role="status"><Icon name="star" /> {selected ? `已定位 #${selected.memberNumber} · ${selected.nickname}` : '点击合照中的人物，翻开个人名片。'}</p>
          <button type="button" onClick={reset} disabled={!selected && !query}><Icon name="reset" /> 返回全体</button>
        </div>
        <footer className="site-footer">
          <span className="micro">GROUP PORTRAIT ARCHIVE <span>©</span> VOL. 06</span>
          <span>北辰青年线上实习 · 第六组群像纪念册</span>
        </footer>
      </main>
    </>
  )
}
