import { club } from '../../content/club'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo" aria-hidden="true">
            ST
          </div>
          <div>
            <div className="serif footer-title">SPANNING TREE</div>
            <div className="footer-copy">
              {club.affiliation} {club.koreanName}
            </div>
          </div>
        </div>
        <div className="footer-details">
          <div className="footer-contact">
            <span>Contact</span>
            <a className="contact-link" href={`mailto:${club.email}`}>
              {club.email}
            </a>
          </div>
          <div className="footer-copy">© Spanning Tree. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
