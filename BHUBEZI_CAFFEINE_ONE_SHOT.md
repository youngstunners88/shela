# Bhubezi → Caffeine One-Shot Code Handoff

This document contains the full code package file-by-file.


## `PROMPT_FOR_CAFFEINE.md`

```markdown
You are receiving a Caffeine-ready rewrite of Bhubezi.

Treat this package as the source of truth for the app.

Goals:
1. Keep the product South Africa-specific and taxi-rank-centric.
2. Preserve the three-role system: Passenger, Driver, Marshal.
3. Preserve the core loops:
   - passenger asks / pings
   - driver responds / updates route occupancy
   - marshal updates rank status / verifies community info
   - social + feedback + points increase engagement
4. Keep the Motoko backend authoritative for routes, pings, posts, FAQs, suggestions, and points.
5. Keep the React frontend modular and maintainable.
6. Build out any missing bindings, auth wiring, and persistence polish without changing the product intent.

Important domain rules:
- Taxi ranks are central objects, not generic map pins.
- Fares are community-verified.
- Marshal updates are trusted signals.
- Low-friction mobile UX matters more than visual complexity.
```


## `README.md`

```markdown
# Bhubezi Caffeine Port

This package is a **Caffeine/ICP-oriented rewrite of Bhubezi**.

It is designed so a platform that prefers **Motoko backend + React/TypeScript frontend** can understand the app in one shot.

## What is preserved from Bhubezi

- Passenger / Driver / Marshal roles
- Jozi taxi rank + route model
- Onboarding flow
- Passenger pings and driver acceptance
- Rank status updates
- Social feed
- Community questions and fare verification
- Feedback / suggestions
- Points + leaderboard

## Architecture

- `src/backend/main.mo` — Motoko canister with seeded ranks/routes and CRUD methods
- `src/frontend/` — React + TypeScript frontend with a reducer-based store and clean service adapter

## Notes

- This is a **best-effort full-stack port**, not a byte-for-byte export of the old Vite app.
- The backend is written to be readable and easy for Caffeine to extend.
- The frontend includes a **mock fallback service** so the UX can still be demonstrated if canister bindings are not wired yet.

## Core product intent

Bhubezi is a community-powered Johannesburg minibus taxi network app. Passengers can discover routes, ping drivers, verify fares, and follow rank activity. Drivers can manage trips and occupancy. Marshals can update rank capacity and moderate community info.
```


## `src/backend/main.mo`

```motoko

import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Bool "mo:base/Bool";
import Option "mo:base/Option";
import Time "mo:base/Time";

actor Bhubezi {
  public type UserRole = { #Passenger; #Driver; #Marshal };
  public type QueueCapacity = { #Empty; #Moving; #HalfFull; #FullHouse; #Overflowing };

  public type Vehicle = {
    brand : Text;
    color : Text;
    plate : Text;
  };

  public type User = {
    id : Text;
    name : Text;
    role : UserRole;
    points : Nat;
    verified : Bool;
    currentRouteId : ?Text;
    occupancy : ?Nat;
    vehicle : ?Vehicle;
  };

  public type Rank = {
    id : Text;
    name : Text;
    location : Text;
    category : Text;
  };

  public type Route = {
    id : Text;
    originId : Text;
    destinationId : Text;
    fare : Nat;
    label : Text;
  };

  public type RankStatus = {
    rankId : Text;
    capacity : QueueCapacity;
    loadEstimate : Nat;
    marshalName : Text;
    lastUpdated : Int;
  };

  public type Ping = {
    id : Text;
    passengerId : Text;
    passengerName : Text;
    originRankId : Text;
    destinationRankId : Text;
    price : Nat;
    message : Text;
    acceptedDriverIds : [Text];
    acceptedDriverNames : [Text];
    createdAt : Int;
    pickedUp : Bool;
  };

  public type SocialReply = {
    id : Text;
    authorId : Text;
    authorName : Text;
    content : Text;
    createdAt : Int;
  };

  public type SocialPost = {
    id : Text;
    authorId : Text;
    authorName : Text;
    content : Text;
    likes : Nat;
    likedBy : [Text];
    replies : [SocialReply];
    createdAt : Int;
  };

  public type Suggestion = {
    id : Text;
    userId : Text;
    userName : Text;
    content : Text;
    kind : Text;
    createdAt : Int;
  };

  public type Faq = {
    id : Text;
    question : Text;
    answer : ?Text;
    answeredBy : ?Text;
    routeId : ?Text;
    verifiedBy : [Text];
    createdAt : Int;
  };

  public type AppSnapshot = {
    users : [User];
    ranks : [Rank];
    routes : [Route];
    rankStatuses : [RankStatus];
    pings : [Ping];
    posts : [SocialPost];
    suggestions : [Suggestion];
    faqs : [Faq];
  };

  stable var users : [User] = [
    {
      id = "driver-baba-joe";
      name = "Baba Joe";
      role = #Driver;
      points = 1550;
      verified = true;
      currentRouteId = ?"bree-bara";
      occupancy = ?9;
      vehicle = ?{ brand = "Toyota Quantum"; color = "White"; plate = "JZ 456 GP" };
    },
    {
      id = "marshal-sis-thuli";
      name = "Sis Thuli";
      role = #Marshal;
      points = 1790;
      verified = true;
      currentRouteId = null;
      occupancy = null;
      vehicle = null;
    },
    {
      id = "passenger-demo";
      name = "Demo Passenger";
      role = #Passenger;
      points = 240;
      verified = true;
      currentRouteId = null;
      occupancy = null;
      vehicle = null;
    }
  ];

  stable let ranks : [Rank] = [
    { id = "bree"; name = "Bree Street"; location = "Joburg CBD"; category = "CBD" },
    { id = "noord"; name = "Noord Street"; location = "Joburg CBD"; category = "CBD" },
    { id = "park"; name = "Park Station"; location = "Joburg CBD"; category = "CBD" },
    { id = "bara"; name = "Bara Rank"; location = "Soweto"; category = "Soweto" },
    { id = "dobsonville"; name = "Dobsonville"; location = "Soweto"; category = "Soweto" },
    { id = "alex"; name = "Alexandra"; location = "Alexandra"; category = "Alexandra" }
  ];

  stable let routes : [Route] = [
    { id = "bree-bara"; originId = "bree"; destinationId = "bara"; fare = 22; label = "Bree → Bara" },
    { id = "noord-dobsonville"; originId = "noord"; destinationId = "dobsonville"; fare = 24; label = "Noord → Dobsonville" },
    { id = "bree-alex"; originId = "bree"; destinationId = "alex"; fare = 18; label = "Bree → Alex" },
    { id = "park-bara"; originId = "park"; destinationId = "bara"; fare = 23; label = "Park → Bara" }
  ];

  stable var rankStatuses : [RankStatus] = [
    {
      rankId = "bree";
      capacity = #Moving;
      loadEstimate = 48;
      marshalName = "Sis Thuli";
      lastUpdated = Time.now();
    },
    {
      rankId = "bara";
      capacity = #HalfFull;
      loadEstimate = 62;
      marshalName = "Baba Joe";
      lastUpdated = Time.now();
    }
  ];

  stable var pings : [Ping] = [];

  stable var posts : [SocialPost] = [
    {
      id = "post-1";
      authorId = "marshal-sis-thuli";
      authorName = "Sis Thuli";
      content = "Bree is moving sharp today. Bara line is clean and fast.";
      likes = 3;
      likedBy = ["passenger-demo"];
      replies = [];
      createdAt = Time.now();
    }
  ];

  stable var suggestions : [Suggestion] = [
    {
      id = "suggestion-1";
      userId = "passenger-demo";
      userName = "Demo Passenger";
      content = "Add better late-night rank updates for workers going home.";
      kind = "IMPROVE";
      createdAt = Time.now();
    }
  ];

  stable var faqs : [Faq] = [
    {
      id = "faq-1";
      question = "How much is Bree to Bara?";
      answer = ?"Usually around R22 unless there is a special event surge.";
      answeredBy = ?"Sis Thuli";
      routeId = ?"bree-bara";
      verifiedBy = ["passenger-demo"];
      createdAt = Time.now();
    }
  ];

  func makeId(prefix : Text) : Text {
    prefix # "-" # Int.toText(Time.now());
  };

  func appendUserPoints(userId : Text, delta : Nat) {
    users := Array.map<User, User>(
      users,
      func(u : User) : User {
        if (u.id == userId) {
          {
            id = u.id;
            name = u.name;
            role = u.role;
            points = u.points + delta;
            verified = u.verified;
            currentRouteId = u.currentRouteId;
            occupancy = u.occupancy;
            vehicle = u.vehicle;
          }
        } else {
          u
        }
      }
    );
  };

  public query func getSnapshot() : async AppSnapshot {
    {
      users = users;
      ranks = ranks;
      routes = routes;
      rankStatuses = rankStatuses;
      pings = pings;
      posts = posts;
      suggestions = suggestions;
      faqs = faqs;
    }
  };

  public shared func registerUser(name : Text, role : UserRole, vehicle : ?Vehicle) : async User {
    let newUser : User = {
      id = makeId("user");
      name = name;
      role = role;
      points = 100;
      verified = role != #Driver;
      currentRouteId = null;
      occupancy = null;
      vehicle = vehicle;
    };
    users := Array.append<User>(users, [newUser]);
    newUser
  };

  public shared func updateDriverStatus(userId : Text, routeId : Text, occupancy : Nat) : async Bool {
    users := Array.map<User, User>(users, func(u : User) : User {
      if (u.id == userId) {
        {
          id = u.id;
          name = u.name;
          role = u.role;
          points = u.points;
          verified = u.verified;
          currentRouteId = ?routeId;
          occupancy = ?occupancy;
          vehicle = u.vehicle;
        }
      } else { u }
    });
    appendUserPoints(userId, 10);
    true
  };

  public shared func createPing(passengerId : Text, passengerName : Text, originRankId : Text, destinationRankId : Text, price : Nat, message : Text) : async Ping {
    let ping : Ping = {
      id = makeId("ping");
      passengerId = passengerId;
      passengerName = passengerName;
      originRankId = originRankId;
      destinationRankId = destinationRankId;
      price = price;
      message = message;
      acceptedDriverIds = [];
      acceptedDriverNames = [];
      createdAt = Time.now();
      pickedUp = false;
    };
    pings := Array.append<Ping>([ping], pings);
    appendUserPoints(passengerId, 5);
    ping
  };

  public shared func acceptPing(pingId : Text, driverId : Text, driverName : Text) : async Bool {
    pings := Array.map<Ping, Ping>(pings, func(p : Ping) : Ping {
      if (p.id == pingId) {
        {
          id = p.id;
          passengerId = p.passengerId;
          passengerName = p.passengerName;
          originRankId = p.originRankId;
          destinationRankId = p.destinationRankId;
          price = p.price;
          message = p.message;
          acceptedDriverIds = Array.append<Text>(p.acceptedDriverIds, [driverId]);
          acceptedDriverNames = Array.append<Text>(p.acceptedDriverNames, [driverName]);
          createdAt = p.createdAt;
          pickedUp = p.pickedUp;
        }
      } else { p }
    });
    appendUserPoints(driverId, 15);
    true
  };

  public shared func confirmPickup(pingId : Text) : async Bool {
    pings := Array.map<Ping, Ping>(pings, func(p : Ping) : Ping {
      if (p.id == pingId) {
        {
          id = p.id;
          passengerId = p.passengerId;
          passengerName = p.passengerName;
          originRankId = p.originRankId;
          destinationRankId = p.destinationRankId;
          price = p.price;
          message = p.message;
          acceptedDriverIds = p.acceptedDriverIds;
          acceptedDriverNames = p.acceptedDriverNames;
          createdAt = p.createdAt;
          pickedUp = true;
        }
      } else { p }
    });
    true
  };

  public shared func updateRankStatus(rankId : Text, capacity : QueueCapacity, loadEstimate : Nat, marshalName : Text) : async Bool {
    let found = Array.find<RankStatus>(rankStatuses, func(s) { s.rankId == rankId });
    let nextStatus : RankStatus = {
      rankId = rankId;
      capacity = capacity;
      loadEstimate = loadEstimate;
      marshalName = marshalName;
      lastUpdated = Time.now();
    };
    switch(found) {
      case(null) {
        rankStatuses := Array.append<RankStatus>(rankStatuses, [nextStatus]);
      };
      case(?_) {
        rankStatuses := Array.map<RankStatus, RankStatus>(rankStatuses, func(s) { if (s.rankId == rankId) nextStatus else s });
      };
    };
    true
  };

  public shared func createPost(authorId : Text, authorName : Text, content : Text) : async SocialPost {
    let post : SocialPost = {
      id = makeId("post");
      authorId = authorId;
      authorName = authorName;
      content = content;
      likes = 0;
      likedBy = [];
      replies = [];
      createdAt = Time.now();
    };
    posts := Array.append<SocialPost>([post], posts);
    appendUserPoints(authorId, 5);
    post
  };

  public shared func likePost(postId : Text, userId : Text) : async Bool {
    posts := Array.map<SocialPost, SocialPost>(posts, func(p : SocialPost) : SocialPost {
      if (p.id == postId and Array.find<Text>(p.likedBy, func(x) { x == userId }) == null) {
        {
          id = p.id;
          authorId = p.authorId;
          authorName = p.authorName;
          content = p.content;
          likes = p.likes + 1;
          likedBy = Array.append<Text>(p.likedBy, [userId]);
          replies = p.replies;
          createdAt = p.createdAt;
        }
      } else { p }
    });
    true
  };

  public shared func replyToPost(postId : Text, authorId : Text, authorName : Text, content : Text) : async Bool {
    posts := Array.map<SocialPost, SocialPost>(posts, func(p : SocialPost) : SocialPost {
      if (p.id == postId) {
        let reply : SocialReply = {
          id = makeId("reply");
          authorId = authorId;
          authorName = authorName;
          content = content;
          createdAt = Time.now();
        };
        {
          id = p.id;
          authorId = p.authorId;
          authorName = p.authorName;
          content = p.content;
          likes = p.likes;
          likedBy = p.likedBy;
          replies = Array.append<SocialReply>(p.replies, [reply]);
          createdAt = p.createdAt;
        }
      } else { p }
    });
    true
  };

  public shared func submitSuggestion(userId : Text, userName : Text, content : Text, kind : Text) : async Suggestion {
    let suggestion : Suggestion = {
      id = makeId("suggestion");
      userId = userId;
      userName = userName;
      content = content;
      kind = kind;
      createdAt = Time.now();
    };
    suggestions := Array.append<Suggestion>([suggestion], suggestions);
    appendUserPoints(userId, 25);
    suggestion
  };

  public shared func askQuestion(question : Text, routeId : ?Text) : async Faq {
    let faq : Faq = {
      id = makeId("faq");
      question = question;
      answer = null;
      answeredBy = null;
      routeId = routeId;
      verifiedBy = [];
      createdAt = Time.now();
    };
    faqs := Array.append<Faq>([faq], faqs);
    faq
  };

  public shared func answerQuestion(faqId : Text, answer : Text, answeredBy : Text) : async Bool {
    faqs := Array.map<Faq, Faq>(faqs, func(f : Faq) : Faq {
      if (f.id == faqId) {
        {
          id = f.id;
          question = f.question;
          answer = ?answer;
          answeredBy = ?answeredBy;
          routeId = f.routeId;
          verifiedBy = f.verifiedBy;
          createdAt = f.createdAt;
        }
      } else { f }
    });
    true
  };

  public shared func verifyAnswer(faqId : Text, verifierUserId : Text) : async Bool {
    faqs := Array.map<Faq, Faq>(faqs, func(f : Faq) : Faq {
      if (f.id == faqId and Array.find<Text>(f.verifiedBy, func(x) { x == verifierUserId }) == null) {
        {
          id = f.id;
          question = f.question;
          answer = f.answer;
          answeredBy = f.answeredBy;
          routeId = f.routeId;
          verifiedBy = Array.append<Text>(f.verifiedBy, [verifierUserId]);
          createdAt = f.createdAt;
        }
      } else { f }
    });
    appendUserPoints(verifierUserId, 10);
    true
  };

  public query func getLeaderboard() : async [User] {
    Array.sort<User>(users, func(a : User, b : User) : { #less; #equal; #greater } {
      if (a.points > b.points) { #less } else if (a.points < b.points) { #greater } else { #equal }
    })
  };
}
```


## `src/frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bhubezi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```


## `src/frontend/package.json`

```json
{
  "name": "bhubezi-caffeine-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.511.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.3.4"
  }
}
```


## `src/frontend/src/App.tsx`

```typescript
import { useMemo, useState } from 'react';
import { AppStoreProvider, useAppStore } from './state/AppStore';
import { OnboardingFlow } from './components/OnboardingFlow';
import { PassengerDashboard } from './components/PassengerDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { MarshalDashboard } from './components/MarshalDashboard';
import { SocialFeed } from './components/SocialFeed';
import { Leaderboard } from './components/Leaderboard';
import { FeedbackHub } from './components/FeedbackHub';
import './styles.css';

function Shell() {
  const { currentUser, snapshot } = useAppStore();
  const [tab, setTab] = useState<'home' | 'social' | 'leaderboard' | 'feedback'>('home');

  const home = useMemo(() => {
    if (!currentUser) return <OnboardingFlow />;
    if (currentUser.role === 'PASSENGER') return <PassengerDashboard />;
    if (currentUser.role === 'DRIVER') return <DriverDashboard />;
    return <MarshalDashboard />;
  }, [currentUser]);

  const verse = useMemo(() => 'Trust in the Lord with all your heart and lean not on your own understanding. — Proverbs 3:5', []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="brand-badge">B</div>
          <div>
            <h1>Bhubezi</h1>
            <p>Keeping Jozi moving.</p>
          </div>
        </div>
        {currentUser && <div className="user-pill">{currentUser.name} · {currentUser.points} pts</div>}
      </header>

      <main className="main-grid">
        <div className="main-column">{home}</div>
        <aside className="side-column">
          <section className="panel compact">
            <div className="section-title">Live summary</div>
            <div className="summary-grid">
              <div><strong>{snapshot?.ranks.length ?? 0}</strong><span>ranks</span></div>
              <div><strong>{snapshot?.routes.length ?? 0}</strong><span>routes</span></div>
              <div><strong>{snapshot?.pings.length ?? 0}</strong><span>pings</span></div>
              <div><strong>{snapshot?.posts.length ?? 0}</strong><span>posts</span></div>
            </div>
            <blockquote>{verse}</blockquote>
          </section>
          {tab === 'social' && <SocialFeed />}
          {tab === 'leaderboard' && <Leaderboard />}
          {tab === 'feedback' && <FeedbackHub />}
          {tab === 'home' && <Leaderboard />}
        </aside>
      </main>

      <nav className="bottom-nav">
        <button className={tab === 'home' ? 'nav-active' : ''} onClick={() => setTab('home')}>Home</button>
        <button className={tab === 'social' ? 'nav-active' : ''} onClick={() => setTab('social')}>Social</button>
        <button className={tab === 'leaderboard' ? 'nav-active' : ''} onClick={() => setTab('leaderboard')}>Leaderboard</button>
        <button className={tab === 'feedback' ? 'nav-active' : ''} onClick={() => setTab('feedback')}>Feedback</button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <Shell />
    </AppStoreProvider>
  );
}
```


## `src/frontend/src/components/DriverDashboard.tsx`

```typescript
import { useMemo, useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function DriverDashboard() {
  const { snapshot, currentUser, updateDriverStatus, acceptPing, confirmPickup } = useAppStore();
  const [routeId, setRouteId] = useState(currentUser?.currentRouteId ?? snapshot?.routes[0]?.id ?? '');
  const [occupancy, setOccupancy] = useState(currentUser?.occupancy ?? 8);

  const relevantPings = useMemo(() => snapshot?.pings.filter(ping => {
    const route = snapshot.routes.find(item => item.id === routeId);
    return route ? ping.originRankId === route.originId && ping.destinationRankId === route.destinationId : true;
  }) ?? [], [snapshot, routeId]);

  if (!snapshot || !currentUser) return null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">Driver trip control</div>
        <div className="form-grid two-col">
          <select value={routeId} onChange={e => setRouteId(e.target.value)}>
            {snapshot.routes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <input type="number" min={1} max={16} value={occupancy} onChange={e => setOccupancy(Number(e.target.value))} />
        </div>
        <button className="primary-btn" onClick={() => updateDriverStatus(routeId, occupancy)}>Update driver status</button>
      </section>

      <section className="panel">
        <div className="section-title">Passenger demand on your route</div>
        <div className="list">
          {relevantPings.map(ping => (
            <div className="list-card" key={ping.id}>
              <div>
                <strong>{ping.passengerName}</strong>
                <p>Offer fare: R{ping.price}</p>
                <small>{ping.message}</small>
              </div>
              <div className="button-column">
                <button className="secondary-btn" onClick={() => acceptPing(ping.id)}>Accept</button>
                <button className="ghost-btn" onClick={() => confirmPickup(ping.id)}>Confirm pickup</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```


## `src/frontend/src/components/FeedbackHub.tsx`

```typescript
import { useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function FeedbackHub() {
  const { snapshot, submitSuggestion } = useAppStore();
  const [kind, setKind] = useState<'IMPROVE' | 'REMOVE'>('IMPROVE');
  const [text, setText] = useState('');

  if (!snapshot) return null;

  return (
    <section className="panel">
      <div className="section-title">Feedback hub</div>
      <div className="button-row">
        <button className={kind === 'IMPROVE' ? 'secondary-btn active-btn' : 'ghost-btn'} onClick={() => setKind('IMPROVE')}>Improve</button>
        <button className={kind === 'REMOVE' ? 'secondary-btn active-btn' : 'ghost-btn'} onClick={() => setKind('REMOVE')}>Remove</button>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Tell the community team what should change." />
      <button className="primary-btn" onClick={() => { if (text.trim()) { submitSuggestion(text.trim(), kind); setText(''); } }}>Submit feedback</button>
      <div className="list">
        {snapshot.suggestions.map(item => (
          <div className="list-card vertical" key={item.id}>
            <strong>{item.userName} · {item.kind}</strong>
            <p>{item.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```


## `src/frontend/src/components/Leaderboard.tsx`

```typescript
import { useAppStore } from '../state/AppStore';

export function Leaderboard() {
  const { snapshot } = useAppStore();
  if (!snapshot) return null;

  const users = [...snapshot.users].sort((a, b) => b.points - a.points);

  return (
    <section className="panel">
      <div className="section-title">Leaderboard</div>
      <div className="list">
        {users.map((user, index) => (
          <div className="list-card" key={user.id}>
            <div>
              <strong>#{index + 1} {user.name}</strong>
              <p>{user.role}</p>
            </div>
            <div className="pill success">{user.points} pts</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```


## `src/frontend/src/components/MarshalDashboard.tsx`

```typescript
import { useState } from 'react';
import { queueCapacityOptions } from '../constants';
import { useAppStore } from '../state/AppStore';

export function MarshalDashboard() {
  const { snapshot, answerQuestion, verifyAnswer, updateRankStatus } = useAppStore();
  const [rankId, setRankId] = useState(snapshot?.ranks[0]?.id ?? '');
  const [capacity, setCapacity] = useState<typeof queueCapacityOptions[number]>('MOVING');
  const [loadEstimate, setLoadEstimate] = useState(45);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!snapshot) return null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">Marshal rank control</div>
        <div className="form-grid three-col">
          <select value={rankId} onChange={e => setRankId(e.target.value)}>
            {snapshot.ranks.map(rank => <option key={rank.id} value={rank.id}>{rank.name}</option>)}
          </select>
          <select value={capacity} onChange={e => setCapacity(e.target.value as typeof capacity)}>
            {queueCapacityOptions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="number" min={0} max={100} value={loadEstimate} onChange={e => setLoadEstimate(Number(e.target.value))} />
        </div>
        <button className="primary-btn" onClick={() => updateRankStatus(rankId, capacity, loadEstimate)}>Publish rank update</button>
      </section>

      <section className="panel">
        <div className="section-title">Community fare questions</div>
        <div className="list">
          {snapshot.faqs.map(faq => (
            <div className="list-card vertical" key={faq.id}>
              <div>
                <strong>{faq.question}</strong>
                <p>{faq.answer ?? 'No answer yet.'}</p>
                <small>{faq.verifiedBy.length} verifications</small>
              </div>
              <textarea
                placeholder="Write or improve the answer"
                value={answers[faq.id] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [faq.id]: e.target.value }))}
              />
              <div className="button-row">
                <button className="secondary-btn" onClick={() => answerQuestion(faq.id, answers[faq.id] ?? '')}>Answer</button>
                <button className="ghost-btn" onClick={() => verifyAnswer(faq.id)}>Verify</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```


## `src/frontend/src/components/OnboardingFlow.tsx`

```typescript
import { useState } from 'react';
import type { UserRole } from '../types';
import { roleDescriptions } from '../constants';
import { useAppStore } from '../state/AppStore';

export function OnboardingFlow() {
  const { registerUser } = useAppStore();
  const [role, setRole] = useState<UserRole>('PASSENGER');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Toyota Quantum');
  const [color, setColor] = useState('White');
  const [plate, setPlate] = useState('');

  return (
    <section className="panel hero-panel">
      <div className="eyebrow">Jozi Taxi Network</div>
      <h1>Bhubezi</h1>
      <p className="lede">Community-powered movement for passengers, drivers, and marshals across Johannesburg taxi ranks.</p>

      <div className="role-grid">
        {(['PASSENGER', 'DRIVER', 'MARSHAL'] as UserRole[]).map(item => (
          <button key={item} className={`role-card ${role === item ? 'active' : ''}`} onClick={() => setRole(item)}>
            <strong>{item}</strong>
            <span>{roleDescriptions[item]}</span>
          </button>
        ))}
      </div>

      <div className="form-grid">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        {role === 'DRIVER' && (
          <>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Vehicle brand" />
            <input value={color} onChange={e => setColor(e.target.value)} placeholder="Vehicle color" />
            <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="Number plate" />
          </>
        )}
      </div>

      <button
        className="primary-btn"
        onClick={() => registerUser(name || 'New User', role, role === 'DRIVER' ? { brand, color, plate } : undefined)}
      >
        Enter Bhubezi
      </button>
    </section>
  );
}
```


## `src/frontend/src/components/PassengerDashboard.tsx`

```typescript
import { useMemo, useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function PassengerDashboard() {
  const { snapshot, createPing, askQuestion } = useAppStore();
  const [routeId, setRouteId] = useState(snapshot?.routes[0]?.id ?? '');
  const [message, setMessage] = useState('I am waiting near the entrance.');

  const route = useMemo(() => snapshot?.routes.find(item => item.id === routeId), [snapshot, routeId]);

  if (!snapshot) return null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">Passenger tools</div>
        <div className="form-grid">
          <select value={routeId} onChange={e => setRouteId(e.target.value)}>
            {snapshot.routes.map(item => <option key={item.id} value={item.id}>{item.label} · R{item.fare}</option>)}
          </select>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a note for drivers" />
        </div>
        <div className="button-row">
          <button className="primary-btn" onClick={() => route && createPing(route.originId, route.destinationId, route.fare, message)}>Ping drivers</button>
          <button className="secondary-btn" onClick={() => route && askQuestion(`How much is ${route.label}?`, route.id)}>Ask fare question</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Live pings</div>
        <div className="list">
          {snapshot.pings.map(ping => (
            <div className="list-card" key={ping.id}>
              <div>
                <strong>{snapshot.ranks.find(rank => rank.id === ping.originRankId)?.name} → {snapshot.ranks.find(rank => rank.id === ping.destinationRankId)?.name}</strong>
                <p>Expected fare: R{ping.price}</p>
                <small>{ping.message}</small>
              </div>
              <div className="pill-stack">
                <span className="pill">{ping.acceptedDriverNames.length} driver offers</span>
                {ping.pickedUp && <span className="pill success">Picked up</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```


## `src/frontend/src/components/SocialFeed.tsx`

```typescript
import { useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function SocialFeed() {
  const { snapshot, createPost, likePost, replyToPost } = useAppStore();
  const [postText, setPostText] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  if (!snapshot) return null;

  return (
    <section className="panel">
      <div className="section-title">Community social feed</div>
      <div className="composer">
        <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share a rank update or taxi wash brag." />
        <button className="primary-btn" onClick={() => { if (postText.trim()) { createPost(postText.trim()); setPostText(''); } }}>Post update</button>
      </div>
      <div className="list">
        {snapshot.posts.map(post => (
          <div className="list-card vertical" key={post.id}>
            <div>
              <strong>{post.authorName}</strong>
              <p>{post.content}</p>
              <small>{post.likes} likes · {post.replies.length} replies</small>
            </div>
            <div className="button-row">
              <button className="secondary-btn" onClick={() => likePost(post.id)}>Like</button>
            </div>
            <textarea
              placeholder="Reply"
              value={replyDrafts[post.id] ?? ''}
              onChange={e => setReplyDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
            />
            <button className="ghost-btn" onClick={() => {
              const text = replyDrafts[post.id]?.trim();
              if (!text) return;
              replyToPost(post.id, text);
              setReplyDrafts(prev => ({ ...prev, [post.id]: '' }));
            }}>Reply</button>
            {post.replies.map(reply => <div className="reply" key={reply.id}><strong>{reply.authorName}</strong><span>{reply.content}</span></div>)}
          </div>
        ))}
      </div>
    </section>
  );
}
```


## `src/frontend/src/constants.ts`

```typescript
import type { QueueCapacity } from './types';

export const queueCapacityOptions: QueueCapacity[] = ['EMPTY', 'MOVING', 'HALF_FULL', 'FULL_HOUSE', 'OVERFLOWING'];

export const roleDescriptions = {
  PASSENGER: 'Find fares, routes, rank movement, and nearby drivers.',
  DRIVER: 'Manage trip demand, occupancy, and accepted pings.',
  MARSHAL: 'Update rank conditions and verify community information.',
} as const;

export const bibleVerses = [
  'Trust in the Lord with all your heart and lean not on your own understanding. — Proverbs 3:5',
  'I can do all things through Christ who strengthens me. — Philippians 4:13',
  'Be strong and courageous. — Joshua 1:9',
];
```


## `src/frontend/src/lib/backend.ts`

```typescript
import type { Snapshot, User, UserRole, Vehicle, QueueCapacity } from '../types';
import { initialSnapshot } from './mockData';

const storageKey = 'bhubezi-caffeine-snapshot';

function loadSnapshot(): Snapshot {
  const raw = localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) as Snapshot : initialSnapshot;
}

function saveSnapshot(snapshot: Snapshot) {
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const BhubeziService = {
  async getSnapshot(): Promise<Snapshot> {
    return loadSnapshot();
  },
  async registerUser(name: string, role: UserRole, vehicle?: Vehicle): Promise<User> {
    const snapshot = loadSnapshot();
    const user: User = { id: id('user'), name, role, points: 100, verified: role !== 'DRIVER', vehicle };
    saveSnapshot({ ...snapshot, users: [...snapshot.users, user] });
    return user;
  },
  async createPing(passengerId: string, passengerName: string, originRankId: string, destinationRankId: string, price: number, message: string) {
    const snapshot = loadSnapshot();
    const ping = { id: id('ping'), passengerId, passengerName, originRankId, destinationRankId, price, message, acceptedDriverIds: [], acceptedDriverNames: [], createdAt: Date.now(), pickedUp: false };
    saveSnapshot({ ...snapshot, pings: [ping, ...snapshot.pings], users: snapshot.users.map(u => u.id === passengerId ? { ...u, points: u.points + 5 } : u) });
    return ping;
  },
  async acceptPing(pingId: string, driverId: string, driverName: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({
      ...snapshot,
      pings: snapshot.pings.map(p => p.id === pingId ? { ...p, acceptedDriverIds: [...p.acceptedDriverIds, driverId], acceptedDriverNames: [...p.acceptedDriverNames, driverName] } : p),
      users: snapshot.users.map(u => u.id === driverId ? { ...u, points: u.points + 15 } : u),
    });
  },
  async confirmPickup(pingId: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, pings: snapshot.pings.map(p => p.id === pingId ? { ...p, pickedUp: true } : p) });
  },
  async updateDriverStatus(userId: string, routeId: string, occupancy: number) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, users: snapshot.users.map(u => u.id === userId ? { ...u, currentRouteId: routeId, occupancy, points: u.points + 10 } : u) });
  },
  async updateRankStatus(rankId: string, capacity: QueueCapacity, loadEstimate: number, marshalName: string) {
    const snapshot = loadSnapshot();
    const next = { rankId, capacity, loadEstimate, marshalName, lastUpdated: Date.now() };
    const exists = snapshot.rankStatuses.some(s => s.rankId === rankId);
    saveSnapshot({ ...snapshot, rankStatuses: exists ? snapshot.rankStatuses.map(s => s.rankId === rankId ? next : s) : [...snapshot.rankStatuses, next] });
  },
  async createPost(authorId: string, authorName: string, content: string) {
    const snapshot = loadSnapshot();
    const post = { id: id('post'), authorId, authorName, content, likes: 0, likedBy: [], replies: [], createdAt: Date.now() };
    saveSnapshot({ ...snapshot, posts: [post, ...snapshot.posts] });
  },
  async likePost(postId: string, userId: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, posts: snapshot.posts.map(post => post.id === postId && !post.likedBy.includes(userId) ? { ...post, likes: post.likes + 1, likedBy: [...post.likedBy, userId] } : post) });
  },
  async replyToPost(postId: string, authorId: string, authorName: string, content: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, posts: snapshot.posts.map(post => post.id === postId ? { ...post, replies: [...post.replies, { id: id('reply'), authorId, authorName, content, createdAt: Date.now() }] } : post) });
  },
  async submitSuggestion(userId: string, userName: string, content: string, kind: 'IMPROVE' | 'REMOVE') {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, suggestions: [{ id: id('suggestion'), userId, userName, content, kind, createdAt: Date.now() }, ...snapshot.suggestions], users: snapshot.users.map(u => u.id === userId ? { ...u, points: u.points + 25 } : u) });
  },
  async askQuestion(question: string, routeId?: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, faqs: [{ id: id('faq'), question, routeId, verifiedBy: [], createdAt: Date.now() }, ...snapshot.faqs] });
  },
  async answerQuestion(faqId: string, answer: string, answeredBy: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, faqs: snapshot.faqs.map(f => f.id === faqId ? { ...f, answer, answeredBy } : f) });
  },
  async verifyAnswer(faqId: string, verifierUserId: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, faqs: snapshot.faqs.map(f => f.id === faqId && !f.verifiedBy.includes(verifierUserId) ? { ...f, verifiedBy: [...f.verifiedBy, verifierUserId] } : f), users: snapshot.users.map(u => u.id === verifierUserId ? { ...u, points: u.points + 10 } : u) });
  },
};
```


## `src/frontend/src/lib/mockData.ts`

```typescript
import type { Snapshot } from '../types';

export const initialSnapshot: Snapshot = {
  users: [
    { id: 'driver-baba-joe', name: 'Baba Joe', role: 'DRIVER', points: 1550, verified: true, currentRouteId: 'bree-bara', occupancy: 9, vehicle: { brand: 'Toyota Quantum', color: 'White', plate: 'JZ 456 GP' } },
    { id: 'marshal-sis-thuli', name: 'Sis Thuli', role: 'MARSHAL', points: 1790, verified: true },
    { id: 'passenger-demo', name: 'Demo Passenger', role: 'PASSENGER', points: 240, verified: true },
  ],
  ranks: [
    { id: 'bree', name: 'Bree Street', location: 'Joburg CBD', category: 'CBD' },
    { id: 'noord', name: 'Noord Street', location: 'Joburg CBD', category: 'CBD' },
    { id: 'park', name: 'Park Station', location: 'Joburg CBD', category: 'CBD' },
    { id: 'bara', name: 'Bara Rank', location: 'Soweto', category: 'Soweto' },
    { id: 'dobsonville', name: 'Dobsonville', location: 'Soweto', category: 'Soweto' },
    { id: 'alex', name: 'Alexandra', location: 'Alexandra', category: 'Alexandra' },
  ],
  routes: [
    { id: 'bree-bara', originId: 'bree', destinationId: 'bara', fare: 22, label: 'Bree → Bara' },
    { id: 'noord-dobsonville', originId: 'noord', destinationId: 'dobsonville', fare: 24, label: 'Noord → Dobsonville' },
    { id: 'bree-alex', originId: 'bree', destinationId: 'alex', fare: 18, label: 'Bree → Alex' },
    { id: 'park-bara', originId: 'park', destinationId: 'bara', fare: 23, label: 'Park → Bara' },
  ],
  rankStatuses: [
    { rankId: 'bree', capacity: 'MOVING', loadEstimate: 48, marshalName: 'Sis Thuli', lastUpdated: Date.now() },
    { rankId: 'bara', capacity: 'HALF_FULL', loadEstimate: 62, marshalName: 'Baba Joe', lastUpdated: Date.now() },
  ],
  pings: [],
  posts: [
    { id: 'post-1', authorId: 'marshal-sis-thuli', authorName: 'Sis Thuli', content: 'Bree is moving sharp today. Bara line is clean and fast.', likes: 3, likedBy: ['passenger-demo'], replies: [], createdAt: Date.now() - 1000 * 60 * 15 },
  ],
  suggestions: [
    { id: 'suggestion-1', userId: 'passenger-demo', userName: 'Demo Passenger', content: 'Add better late-night rank updates for workers going home.', kind: 'IMPROVE', createdAt: Date.now() - 1000 * 60 * 45 },
  ],
  faqs: [
    { id: 'faq-1', question: 'How much is Bree to Bara?', answer: 'Usually around R22 unless there is a special event surge.', answeredBy: 'Sis Thuli', routeId: 'bree-bara', verifiedBy: ['passenger-demo'], createdAt: Date.now() - 1000 * 60 * 60 },
  ],
};
```


## `src/frontend/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```


## `src/frontend/src/state/AppStore.tsx`

```typescript
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Snapshot, User, UserRole, Vehicle, QueueCapacity } from '../types';
import { BhubeziService } from '../lib/backend';

interface AppStoreValue {
  snapshot: Snapshot | null;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  refresh: () => Promise<void>;
  registerUser: (name: string, role: UserRole, vehicle?: Vehicle) => Promise<User>;
  createPing: (originRankId: string, destinationRankId: string, price: number, message: string) => Promise<void>;
  acceptPing: (pingId: string) => Promise<void>;
  confirmPickup: (pingId: string) => Promise<void>;
  updateDriverStatus: (routeId: string, occupancy: number) => Promise<void>;
  updateRankStatus: (rankId: string, capacity: QueueCapacity, loadEstimate: number) => Promise<void>;
  createPost: (content: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  replyToPost: (postId: string, content: string) => Promise<void>;
  submitSuggestion: (content: string, kind: 'IMPROVE' | 'REMOVE') => Promise<void>;
  askQuestion: (question: string, routeId?: string) => Promise<void>;
  answerQuestion: (faqId: string, answer: string) => Promise<void>;
  verifyAnswer: (faqId: string) => Promise<void>;
}

const AppStore = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const refresh = async () => {
    const next = await BhubeziService.getSnapshot();
    setSnapshot(next);
    if (currentUser) {
      const updated = next.users.find(user => user.id === currentUser.id) || currentUser;
      setCurrentUser(updated);
    }
  };

  useEffect(() => { refresh(); }, []);

  const value = useMemo<AppStoreValue>(() => ({
    snapshot,
    currentUser,
    setCurrentUser,
    refresh,
    registerUser: async (name, role, vehicle) => {
      const user = await BhubeziService.registerUser(name, role, vehicle);
      setCurrentUser(user);
      await refresh();
      return user;
    },
    createPing: async (originRankId, destinationRankId, price, message) => {
      if (!currentUser) return;
      await BhubeziService.createPing(currentUser.id, currentUser.name, originRankId, destinationRankId, price, message);
      await refresh();
    },
    acceptPing: async pingId => {
      if (!currentUser) return;
      await BhubeziService.acceptPing(pingId, currentUser.id, currentUser.name);
      await refresh();
    },
    confirmPickup: async pingId => {
      await BhubeziService.confirmPickup(pingId);
      await refresh();
    },
    updateDriverStatus: async (routeId, occupancy) => {
      if (!currentUser) return;
      await BhubeziService.updateDriverStatus(currentUser.id, routeId, occupancy);
      await refresh();
    },
    updateRankStatus: async (rankId, capacity, loadEstimate) => {
      if (!currentUser) return;
      await BhubeziService.updateRankStatus(rankId, capacity, loadEstimate, currentUser.name);
      await refresh();
    },
    createPost: async content => {
      if (!currentUser) return;
      await BhubeziService.createPost(currentUser.id, currentUser.name, content);
      await refresh();
    },
    likePost: async postId => {
      if (!currentUser) return;
      await BhubeziService.likePost(postId, currentUser.id);
      await refresh();
    },
    replyToPost: async (postId, content) => {
      if (!currentUser) return;
      await BhubeziService.replyToPost(postId, currentUser.id, currentUser.name, content);
      await refresh();
    },
    submitSuggestion: async (content, kind) => {
      if (!currentUser) return;
      await BhubeziService.submitSuggestion(currentUser.id, currentUser.name, content, kind);
      await refresh();
    },
    askQuestion: async (question, routeId) => {
      await BhubeziService.askQuestion(question, routeId);
      await refresh();
    },
    answerQuestion: async (faqId, answer) => {
      if (!currentUser) return;
      await BhubeziService.answerQuestion(faqId, answer, currentUser.name);
      await refresh();
    },
    verifyAnswer: async faqId => {
      if (!currentUser) return;
      await BhubeziService.verifyAnswer(faqId, currentUser.id);
      await refresh();
    },
  }), [snapshot, currentUser]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const store = useContext(AppStore);
  if (!store) throw new Error('useAppStore must be used inside AppStoreProvider');
  return store;
}
```


## `src/frontend/src/styles.css`

```css

:root {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111827;
  background: #facc15;
}

* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: linear-gradient(180deg, #facc15 0%, #fef08a 100%); }
button, input, textarea, select { font: inherit; }
textarea, input, select { width: 100%; border: 2px solid #111827; border-radius: 16px; padding: 0.85rem 1rem; background: white; }
textarea { min-height: 92px; resize: vertical; }

.app-shell { min-height: 100vh; padding: 1.2rem; }
.app-header {
  display: flex; justify-content: space-between; align-items: center; gap: 1rem;
  margin-bottom: 1.2rem; padding: 1rem 1.2rem; background: #111827; color: white; border-radius: 24px;
}
.app-header > div:first-child { display: flex; gap: 0.9rem; align-items: center; }
.brand-badge { width: 46px; height: 46px; border-radius: 14px; background: #facc15; color: #111827; display: grid; place-items: center; font-weight: 900; font-style: italic; font-size: 1.5rem; }
.app-header h1 { margin: 0; font-size: 1.65rem; }
.app-header p { margin: 0.2rem 0 0; opacity: 0.8; }
.user-pill { background: rgba(255,255,255,0.14); border-radius: 999px; padding: 0.7rem 1rem; }

.main-grid { display: grid; grid-template-columns: 1.65fr 1fr; gap: 1rem; }
.main-column, .side-column, .stack { display: flex; flex-direction: column; gap: 1rem; }
.panel {
  background: rgba(255,255,255,0.96); border: 3px solid #111827; border-radius: 28px; padding: 1.15rem;
  box-shadow: 8px 8px 0 #111827;
}
.panel.compact { padding: 1rem; }
.hero-panel h1 { margin: 0 0 0.3rem; font-size: clamp(2.3rem, 6vw, 4.1rem); font-style: italic; text-transform: uppercase; }
.eyebrow, .section-title { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.74rem; font-weight: 900; margin-bottom: 0.7rem; }
.lede { max-width: 52ch; line-height: 1.6; }
.role-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; margin: 1.2rem 0; }
.role-card { padding: 1rem; border: 2px solid #111827; border-radius: 20px; background: white; text-align: left; cursor: pointer; }
.role-card.active { background: #111827; color: white; }
.role-card strong { display: block; margin-bottom: 0.45rem; }
.role-card span { font-size: 0.92rem; line-height: 1.45; }
.form-grid { display: grid; gap: 0.8rem; }
.form-grid.two-col { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.form-grid.three-col { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.primary-btn, .secondary-btn, .ghost-btn {
  border: 2px solid #111827; border-radius: 999px; padding: 0.85rem 1.15rem; cursor: pointer; font-weight: 800;
}
.primary-btn { background: #111827; color: white; }
.secondary-btn { background: #fde047; color: #111827; }
.secondary-btn.active-btn { outline: 3px solid #111827; }
.ghost-btn { background: white; color: #111827; }
.button-row { display: flex; gap: 0.7rem; flex-wrap: wrap; }
.button-column { display: flex; flex-direction: column; gap: 0.55rem; }
.list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.8rem; }
.list-card { background: #fff; border: 2px solid #111827; border-radius: 20px; padding: 1rem; display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.list-card.vertical { flex-direction: column; }
.list-card p { margin: 0.25rem 0; line-height: 1.45; }
.list-card small { color: #4b5563; }
.reply { display: grid; gap: 0.2rem; background: #fef9c3; border-radius: 14px; padding: 0.75rem; }
.pill-stack { display: flex; flex-direction: column; gap: 0.45rem; }
.pill { background: #e5e7eb; padding: 0.4rem 0.7rem; border-radius: 999px; font-size: 0.82rem; font-weight: 700; }
.pill.success { background: #dcfce7; }
.composer { display: grid; gap: 0.75rem; }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.summary-grid div { background: #fff; border: 2px solid #111827; border-radius: 18px; padding: 0.85rem; display: grid; }
.summary-grid strong { font-size: 1.5rem; }
.summary-grid span { color: #4b5563; text-transform: uppercase; font-size: 0.74rem; font-weight: 800; }
blockquote { margin: 1rem 0 0; padding: 0.85rem 1rem; background: #fef9c3; border-left: 4px solid #111827; border-radius: 12px; line-height: 1.55; }
.bottom-nav { display: none; }

@media (max-width: 900px) {
  .main-grid { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .app-shell { padding: 0.85rem; }
  .role-grid, .form-grid.two-col, .form-grid.three-col { grid-template-columns: 1fr; }
  .app-header { flex-direction: column; align-items: stretch; }
  .bottom-nav {
    position: sticky; bottom: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; padding-top: 1rem;
  }
  .bottom-nav button {
    border: 2px solid #111827; border-radius: 16px; padding: 0.85rem 0.5rem; background: white; font-weight: 800;
  }
  .bottom-nav .nav-active { background: #111827; color: white; }
}
```


## `src/frontend/src/types.ts`

```typescript
export type UserRole = 'PASSENGER' | 'DRIVER' | 'MARSHAL';
export type QueueCapacity = 'EMPTY' | 'MOVING' | 'HALF_FULL' | 'FULL_HOUSE' | 'OVERFLOWING';

export interface Vehicle {
  brand: string;
  color: string;
  plate: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  points: number;
  verified: boolean;
  currentRouteId?: string;
  occupancy?: number;
  vehicle?: Vehicle;
}

export interface Rank {
  id: string;
  name: string;
  location: string;
  category: string;
}

export interface Route {
  id: string;
  originId: string;
  destinationId: string;
  fare: number;
  label: string;
}

export interface RankStatus {
  rankId: string;
  capacity: QueueCapacity;
  loadEstimate: number;
  marshalName: string;
  lastUpdated: number;
}

export interface Ping {
  id: string;
  passengerId: string;
  passengerName: string;
  originRankId: string;
  destinationRankId: string;
  price: number;
  message: string;
  acceptedDriverIds: string[];
  acceptedDriverNames: string[];
  createdAt: number;
  pickedUp: boolean;
}

export interface SocialReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  likedBy: string[];
  replies: SocialReply[];
  createdAt: number;
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  content: string;
  kind: 'IMPROVE' | 'REMOVE';
  createdAt: number;
}

export interface Faq {
  id: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  routeId?: string;
  verifiedBy: string[];
  createdAt: number;
}

export interface Snapshot {
  users: User[];
  ranks: Rank[];
  routes: Route[];
  rankStatuses: RankStatus[];
  pings: Ping[];
  posts: SocialPost[];
  suggestions: Suggestion[];
  faqs: Faq[];
}
```


## `src/frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}
```


## `src/frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```
