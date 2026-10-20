import { PageAsideClose, PageHeader, PageTitle } from '@ap-education/ui';
import { CaretDownIcon, SparkleIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { type PropsWithChildren, type ReactNode, useState } from 'react';

import { Avatar } from '@/shared/ui/Avatar';

import { type ClientConversation, type ClientTask, funnelNames } from '../data';

const useStyles = createStyles(({ token, css }) => ({
  card: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    color: ${token.colorText};
  `,
  scroll: css`
    min-height: 0;
    overflow-y: auto;
  `,
  identity: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 16px 12px;
  `,
  identityText: css`
    display: grid;
    gap: 2px;
    min-width: 0;
  `,
  name: css`
    overflow: hidden;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
  caption: css`
    color: ${token.colorTextTertiary};
    font-size: 12px;
  `,
  state: css`
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorText};
    font-size: 13px;
    line-height: 1.45;

    svg {
      flex: none;
      margin-top: 2px;
      color: ${token.colorPrimary};
    }
  `,
  section: css`
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  sectionHead: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 14px 16px;
    border: 0;
    background: none;
    color: ${token.colorTextSecondary};
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    cursor: pointer;

    svg {
      transition: transform 0.18s;
    }
  `,
  collapsed: css`
    svg {
      transform: rotate(-90deg);
    }
  `,
  sectionBody: css`
    display: grid;
    gap: 10px;
    padding: 0 16px 14px;
    font-size: 13px;
  `,
  field: css`
    display: flex;
    justify-content: space-between;
    gap: 12px;

    dt {
      color: ${token.colorTextSecondary};
    }

    dd {
      margin: 0;
      font-weight: 500;
      text-align: right;
    }
  `,
  urgent: css`
    color: ${token.colorError};
    font-weight: 600;
  `,
  task: css`
    display: flex;
    gap: 10px;
    align-items: flex-start;

    input {
      margin-top: 3px;
      accent-color: ${token.colorPrimary};
    }
  `,
  taskMeta: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
    color: ${token.colorTextTertiary};
    font-size: 12px;
  `,
  high: css`
    padding: 0 6px;
    border-radius: 4px;
    background: ${token.colorErrorBg};
    color: ${token.colorError};
    font-weight: 600;
  `,
  muted: css`
    color: ${token.colorTextTertiary};
  `,
  event: css`
    display: flex;
    gap: 10px;

    time {
      flex: none;
      min-width: 64px;
      color: ${token.colorTextTertiary};
      font-variant-numeric: tabular-nums;
    }
  `,
}));

function Section({
  title,
  defaultOpen = true,
  children,
}: PropsWithChildren<{ title: string; defaultOpen?: boolean }>) {
  const { styles, cx } = useStyles();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={styles.section}>
      <button
        className={cx(styles.sectionHead, !open && styles.collapsed)}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {title}
        <CaretDownIcon size={16} />
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { styles } = useStyles();
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Task({ task }: { task: ClientTask }) {
  const { styles } = useStyles();
  const [done, setDone] = useState(task.done ?? false);

  return (
    <label className={styles.task}>
      <input type="checkbox" checked={done} onChange={(event) => setDone(event.target.checked)} />
      <span>
        <span>{task.title}</span>
        <span className={styles.taskMeta}>
          <span>→ {task.owner}</span>
          <span>{task.due}</span>
          {task.priority === 'high' && <span className={styles.high}>high</span>}
        </span>
      </span>
    </label>
  );
}

/** Everything about the client beside the conversation: the deal, what is to do, what happened. */
export function ClientCard({ conversation }: { conversation: ClientConversation }) {
  const { styles } = useStyles();
  const urgency = conversation.sla ? `SLA ${conversation.sla}` : conversation.overdue && 'overdue';

  return (
    <div className={styles.card}>
      <PageHeader>
        <PageTitle>Client card</PageTitle>
        <PageAsideClose aria-label="Close the client card" />
      </PageHeader>
      <div className={styles.scroll}>
        <div className={styles.identity}>
          <Avatar path={null} alt={conversation.name} size={44} shape="circle" />
          <span className={styles.identityText}>
            <span className={styles.name}>{conversation.name}</span>
            <span className={styles.caption}>
              crm-{conversation.id} · client · {conversation.country}
            </span>
          </span>
        </div>
        <p className={styles.state}>
          <SparkleIcon size={14} weight="fill" />
          {conversation.state}
        </p>
        <Section title={`Deal · ${conversation.funnel}`}>
          <dl className={styles.sectionBody} style={{ padding: 0 }}>
            <Field label="Funnel · stage">
              {funnelNames[conversation.funnel]} · <b>{conversation.stage}</b>
            </Field>
            <Field label="Programme">{conversation.programme}</Field>
            <Field label="Source">{conversation.source}</Field>
            <Field label="Next step">
              <span className={urgency ? styles.urgent : undefined}>
                {conversation.next}
                {urgency && ` · ${urgency}`}
              </span>
            </Field>
            <Field label="Amount">{conversation.sum}</Field>
            <Field label="Owner">{conversation.owner}</Field>
          </dl>
        </Section>
        <Section title={`Tasks · ${conversation.tasks.length}`}>
          {conversation.tasks.map((task) => (
            <Task key={task.title} task={task} />
          ))}
          {!conversation.tasks.length && <span className={styles.muted}>no tasks</span>}
        </Section>
        <Section
          title={`Calls and meetings · ${conversation.calls.length}`}
          defaultOpen={conversation.calls.length > 0}
        >
          {conversation.calls.map((call) => (
            <div key={call.at + call.summary}>
              <div className={styles.caption}>
                {call.at} · {call.duration}
              </div>
              <div>{call.summary}</div>
              {call.open && <div className={styles.urgent}>still open: {call.open}</div>}
            </div>
          ))}
          {!conversation.calls.length && <span className={styles.muted}>no calls yet</span>}
        </Section>
        <Section title="Client calendar">
          {conversation.events.map((event) => (
            <div key={event.date + event.text} className={styles.event}>
              <time>{event.date}</time>
              <span>{event.text}</span>
            </div>
          ))}
          <span className={styles.muted}>events, not classes · the timetable is in LMS</span>
        </Section>
        <Section title="Fields">
          <dl className={styles.sectionBody} style={{ padding: 0 }}>
            <Field label="Person">contact</Field>
            <Field label="Channel">{conversation.channel}</Field>
            <Field label="Intake">{conversation.intake}</Field>
            <Field label="Language">{conversation.language}</Field>
            <Field label="Country">{conversation.country}</Field>
          </dl>
        </Section>
      </div>
    </div>
  );
}
