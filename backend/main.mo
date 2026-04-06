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
