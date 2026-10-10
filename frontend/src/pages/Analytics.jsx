import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import Page from '../components/Page';
import { Button, Card, EmptyState, PageHeader, SectionHeader } from '../components/ui';
import { ActivityChart, ColumnChart, RankBars } from '../charts/Charts';
import { useScreenings } from '../hooks/useScreenings';
import { summarize } from '../utils/analytics';
import { skillLabel } from '../utils/format';

export default function Analytics() {
  const list = useScreenings(); const s = summarize(list);
  const lab = (rows) => rows.map(([k, n]) => [skillLabel(k), n]);
  return (
    <Page>
      <PageHeader eyebrow="Recruiter analytics" title={<>Hiring <em>analytics.</em></>} description="Patterns across every candidate you’ve screened." />
      {!list.length ? <Card><EmptyState icon={BarChart3} title="No data to analyse yet" description="Analytics are computed from your real screenings. Run a few and this page fills in." action={<Button as={Link} to="/app/screen">New screening</Button>} /></Card> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 lg:col-span-2"><SectionHeader eyebrow="Screening trend" title="Screenings per day (14 days)" /><div className="mt-4"><ActivityChart data={s.days} height={240} label="Screenings per day" /></div></Card>
          <Card className="p-6"><SectionHeader eyebrow="Candidate quality" title="Match score distribution" description={`Average ${s.avg.toFixed(1)}% across ${s.total} candidate${s.total > 1 ? 's' : ''}.`} /><div className="mt-4"><ColumnChart data={s.bins} x="range" colors={['#c23a3a', '#d4504a', '#c98a1a', '#7bb26a', '#17935a']} label="Match score distribution" /></div></Card>
          <Card className="p-6"><SectionHeader eyebrow="Experience" title="Experience distribution" /><div className="mt-4"><ColumnChart data={s.expBins} x="label" label="Experience distribution" /></div></Card>
          <Card className="p-6"><SectionHeader eyebrow="Skill demand" title="Skills your roles ask for" /><div className="mt-5"><RankBars rows={lab(s.demand)} total={s.total} /></div></Card>
          <Card className="p-6"><SectionHeader eyebrow="Gap analysis" title="Skills candidates most often lack" description="Required by a role but not found on the resume." /><div className="mt-5"><RankBars rows={lab(s.missing)} color="#c23a3a" total={s.total} empty="No missing skills — every required skill was found." /></div></Card>
          <Card className="p-6"><SectionHeader eyebrow="Talent pool" title="Most common candidate skills" /><div className="mt-5"><RankBars rows={lab(s.held)} color="#17935a" total={s.total} /></div></Card>
          <Card className="p-6"><SectionHeader eyebrow="Education" title="Highest qualification detected" /><div className="mt-5"><RankBars rows={s.edu} total={s.total} /></div></Card>
        </div>
      )}
    </Page>
  );
}
